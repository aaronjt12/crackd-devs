import prisma from '../config/database';
import logger from '../config/logger';
import { OutreachStatus } from '@prisma/client';
import nodemailer from 'nodemailer';

interface EmailTemplate {
  subject: string;
  body: string;
  variables: Record<string, string>;
}

interface OutreachResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export class OutreachService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration missing, outreach emails will be simulated');
    }
  }

  async createOutreachCampaign(contractId: string): Promise<OutreachResult> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { awardee: true },
      });

      if (!contract || !contract.awardee) {
        throw new Error('Contract or awardee not found');
      }

      const existingOutreach = await prisma.outreachAttempt.findFirst({
        where: {
          contractId,
          status: {
            in: [OutreachStatus.SENT, OutreachStatus.RESPONDED_INTERESTED],
          },
        },
      });

      if (existingOutreach) {
        logger.info('Outreach already exists for contract', { contractId });
        return { success: true, emailId: existingOutreach.id };
      }

      const template = this.generateEmailTemplate(contract, contract.awardee);
      const result = await this.sendEmail(contract.awardee, template);

      const outreachAttempt = await prisma.outreachAttempt.create({
        data: {
          contractId,
          awardeeId: contract.awardee.id,
          emailSent: result.success,
          emailSentAt: result.success ? new Date() : null,
          emailSubject: template.subject,
          emailBody: template.body,
          status: result.success ? OutreachStatus.SENT : OutreachStatus.PENDING,
        },
      });

      logger.info('Outreach campaign created', {
        contractId,
        outreachId: outreachAttempt.id,
        success: result.success
      });

      return {
        success: result.success,
        emailId: outreachAttempt.id,
        error: result.error,
      };
    } catch (error) {
      logger.error('Error creating outreach campaign', { contractId, error });
      throw error;
    }
  }

  private generateEmailTemplate(contract: any, awardee: any): EmailTemplate {
    const contactName = awardee.contactName || 'Team';
    const contractTitle = contract.title || 'Recent Contract';
    const awardingAgency = contract.awardingAgency || 'Federal Agency';
    const industryType = this.getIndustryFromNAICS(contract.naicsCode);

    const subject = `Partnership Inquiry: Subcontracting Support for ${contractTitle}`;

    const body = `
Hi ${contactName},

Congratulations on recently being awarded the ${contractTitle} contract with ${awardingAgency}.

We specialize in connecting prime contractors with highly qualified, pre-vetted subcontractors in the ${industryType} space. We understand that fulfilling federal contracts often requires rapidly scaling your workforce or bringing in specialized expertise.

We have a network of capable subcontractors ready to deploy for this specific requirement. We handle the sourcing, vetting, and initial matching, allowing you to focus on managing the overall contract delivery.

Our value proposition:
• Pre-vetted, qualified subcontractors with relevant experience
• Quick deployment capability (typically within 48-72 hours)
• Competitive rates with transparent commission structure
• Ongoing support throughout the contract lifecycle
• Risk mitigation through proper vetting and compliance checks

Would you be open to a brief 10-minute call next week to discuss how we can support your fulfillment of this contract?

Best regards,
${process.env.SENDER_NAME || 'Partnership Team'}
${process.env.SENDER_TITLE || 'Business Development'}
${process.env.COMPANY_NAME || 'Gov Contract Broker'}
${process.env.CONTACT_EMAIL || 'partnerships@example.com'}
${process.env.CONTACT_PHONE || '555-0100'}

---
To unsubscribe from future communications, please reply with 'UNSUBSCRIBE' in the subject line.
    `.trim();

    return {
      subject,
      body,
      variables: {
        contactName,
        contractTitle,
        awardingAgency,
        industryType,
      },
    };
  }

  private async sendEmail(awardee: any, template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        logger.info('Email simulation mode - would send email', {
          to: awardee.email || awardee.contactEmail,
          subject: template.subject,
        });
        return { success: true };
      }

      const recipientEmail = awardee.email || awardee.contactEmail;

      if (!recipientEmail) {
        return { success: false, error: 'No email address available' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: recipientEmail,
        subject: template.subject,
        text: template.body,
        html: template.body.replace(/\n/g, '<br>'),
      };

      await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', { to: recipientEmail });
      return { success: true };
    } catch (error) {
      logger.error('Error sending email', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processOutreachQueue(): Promise<void> {
    try {
      const pendingContracts = await prisma.contract.findMany({
        where: {
          outreachAttempts: {
            none: {},
          },
          awardee: {
            isNot: null,
          },
        },
        include: {
          awardee: true,
        },
        take: 10,
      });

      logger.info(`Processing outreach queue with ${pendingContracts.length} contracts`);

      for (const contract of pendingContracts) {
        await this.createOutreachCampaign(contract.id);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      logger.error('Error processing outreach queue', { error });
    }
  }

  async handleResponse(outreachId: string, responseType: 'interested' | 'not_interested' | 'needs_info', responseContent?: string): Promise<void> {
    try {
      const statusMap = {
        'interested': OutreachStatus.RESPONDED_INTERESTED,
        'not_interested': OutreachStatus.RESPONDED_NOT_INTERESTED,
        'needs_info': OutreachStatus.FOLLOW_UP_REQUIRED,
      };

      await prisma.outreachAttempt.update({
        where: { id: outreachId },
        data: {
          responseReceived: true,
          responseDate: new Date(),
          responseContent,
          status: statusMap[responseType],
        },
      });

      logger.info('Outreach response recorded', { outreachId, responseType });
    } catch (error) {
      logger.error('Error handling outreach response', { outreachId, error });
      throw error;
    }
  }

  async getOutreachMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, responded, interested] = await Promise.all([
      prisma.outreachAttempt.count({ where }),
      prisma.outreachAttempt.count({
        where: { ...where, status: OutreachStatus.SENT }
      }),
      prisma.outreachAttempt.count({
        where: { ...where, responseReceived: true }
      }),
      prisma.outreachAttempt.count({
        where: { ...where, status: OutreachStatus.RESPONDED_INTERESTED }
      }),
    ]);

    return {
      total,
      sent,
      responded,
      interested,
      responseRate: sent > 0 ? (responded / sent) * 100 : 0,
      conversionRate: sent > 0 ? (interested / sent) * 100 : 0,
    };
  }

  private getIndustryFromNAICS(naicsCode?: string): string {
    if (!naicsCode) return 'government contracting';

    const industries: Record<string, string> = {
      '541219': 'Accounting Services',
      '541511': 'Custom Computer Programming',
      '541512': 'Computer Systems Design',
      '541611': 'Management Consulting',
      '561320': 'Staffing Services',
      '488510': 'Logistics and Transportation',
    };

    return industries[naicsCode] || 'professional services';
  }

  async sendFollowUp(outreachId: string): Promise<OutreachResult> {
    try {
      const outreach = await prisma.outreachAttempt.findUnique({
        where: { id: outreachId },
        include: {
          contract: true,
          awardee: true,
        },
      });

      if (!outreach) {
        throw new Error('Outreach attempt not found');
      }

      const followUpTemplate = this.generateFollowUpTemplate(outreach);
      const result = await this.sendEmail(outreach.awardee, followUpTemplate);

      await prisma.outreachAttempt.update({
        where: { id: outreachId },
        data: {
          notes: `Follow-up sent on ${new Date().toISOString()}`,
        },
      });

      return result;
    } catch (error) {
      logger.error('Error sending follow-up', { outreachId, error });
      throw error;
    }
  }

  private generateFollowUpTemplate(outreach: any): EmailTemplate {
    const contactName = outreach.awardee.contactName || 'Team';
    const contractTitle = outreach.contract.title || 'your recent contract';

    const subject = `Re: Partnership Inquiry - Following Up`;

    const body = `
Hi ${contactName},

I wanted to follow up on my previous email regarding partnership opportunities for ${contractTitle}.

I understand you may be busy with the initial contract setup. We're here to help streamline the subcontracting process whenever you're ready.

Our team has already identified several qualified subcontractors who could support this contract. Would you have 10 minutes this week for a brief call?

Best regards,
${process.env.SENDER_NAME || 'Partnership Team'}
    `.trim();

    return {
      subject,
      body,
      variables: {
        contactName,
        contractTitle,
      },
    };
  }
}