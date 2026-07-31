import { Request, Response } from 'express';
import prisma from '../config/database';
import axios from 'axios';
import logger from '../config/logger';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      // Get current date ranges
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch from USAspending API
      const response = await axios.post(`${USASPENDING_API}/search/spending_by_award/`, {
        filters: {
          time_period: [{
            start_date: thirtyDaysAgo.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0]
          }],
          award_type_codes: ['A', 'B', 'C', 'D']
        },
        limit: 100,
        page: 1
      });

      // Calculate statistics
      const contracts = response.data.results;
      const totalValue = contracts.reduce((sum: number, c: any) => sum + (c['Award Amount'] || 0), 0);
      const avgValue = contracts.length > 0 ? totalValue / contracts.length : 0;

      // Get top agencies
      const agencyCount: Record<string, number> = {};
      contracts.forEach((c: any) => {
        const agency = c['Awarding Agency'];
        if (agency) {
          agencyCount[agency] = (agencyCount[agency] || 0) + 1;
        }
      });

      const topAgencies = Object.entries(agencyCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Get database stats if available
      const [dbContracts, dbAwardees, lastSync] = await Promise.all([
        prisma.contract.count(),
        prisma.awardee.count(),
        prisma.syncLog.findFirst({
          orderBy: { startTime: 'desc' }
        })
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalContracts: contracts.length,
            totalValue,
            averageValue: avgValue,
            period: '30 days'
          },
          topAgencies,
          database: {
            totalContracts: dbContracts,
            totalAwardees: dbAwardees,
            lastSync: lastSync?.startTime
          },
          recentActivity: contracts.slice(0, 5).map((c: any) => ({
            recipient: c['Recipient Name'],
            amount: c['Award Amount'],
            agency: c['Awarding Agency'],
            date: c['Start Date']
          }))
        }
      });

    } catch (error) {
      logger.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics'
      });
    }
  }

  /**
   * Get charts data for dashboard
   */
  async getChartData(req: Request, res: Response) {
    try {
      const { chartType = 'timeline' } = req.query;

      switch (chartType) {
        case 'timeline':
          const timelineData = await this.getTimelineData();
          res.json({ success: true, data: timelineData });
          break;

        case 'naics':
          const naicsData = await this.getNAICSDistribution();
          res.json({ success: true, data: naicsData });
          break;

        case 'agencies':
          const agencyData = await this.getAgencyDistribution();
          res.json({ success: true, data: agencyData });
          break;

        case 'setasides':
          const setAsideData = await this.getSetAsideDistribution();
          res.json({ success: true, data: setAsideData });
          break;

        default:
          res.status(400).json({
            success: false,
            error: 'Invalid chart type'
          });
      }

    } catch (error) {
      logger.error('Chart data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chart data'
      });
    }
  }

  private async getTimelineData() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const response = await axios.post(`${USASPENDING_API}/search/spending_over_time/`, {
      filters: {
        time_period: [{
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }],
        award_type_codes: ['A', 'B', 'C', 'D']
      },
      group: 'month'
    });

    return {
      type: 'timeline',
      labels: response.data.results.map((r: any) => r.time_period.period_name),
      datasets: [{
        label: 'Contract Value',
        data: response.data.results.map((r: any) => r.aggregated_amount)
      }]
    };
  }

  private async getNAICSDistribution() {
    const response = await axios.post(`${USASPENDING_API}/search/spending_by_category/naics/`, {
      filters: {
        time_period: [{
          start_date: '2024-01-01',
          end_date: new Date().toISOString().split('T')[0]
        }],
        award_type_codes: ['A', 'B', 'C', 'D']
      },
      limit: 10,
      page: 1
    });

    return {
      type: 'naics',
      labels: response.data.results.map((r: any) => r.name),
      datasets: [{
        label: 'Spending by NAICS',
        data: response.data.results.map((r: any) => r.amount)
      }]
    };
  }

  private async getAgencyDistribution() {
    const response = await axios.post(`${USASPENDING_API}/search/spending_by_agency/`, {
      filters: {
        time_period: [{
          start_date: '2024-01-01',
          end_date: new Date().toISOString().split('T')[0]
        }],
        award_type_codes: ['A', 'B', 'C', 'D']
      },
      limit: 10,
      page: 1
    });

    return {
      type: 'agencies',
      labels: response.data.results.map((r: any) => r.name),
      datasets: [{
        label: 'Spending by Agency',
        data: response.data.results.map((r: any) => r.amount)
      }]
    };
  }

  private async getSetAsideDistribution() {
    // This would need proper implementation
    return {
      type: 'setasides',
      labels: ['Small Business', '8(a)', 'WOSB', 'SDVOSB', 'HUBZone', 'None'],
      datasets: [{
        label: 'Contracts by Set-Aside Type',
        data: [45, 25, 15, 10, 8, 120]
      }]
    };
  }

  /**
   * Get notifications/alerts
   */
  async getNotifications(req: Request, res: Response) {
    try {
      // Mock notifications - would be from database in production
      const notifications = [
        {
          id: '1',
          type: 'new_contract',
          title: 'New High-Value Contract',
          message: 'DOD awarded $5M IT services contract',
          timestamp: new Date(),
          read: false
        },
        {
          id: '2',
          type: 'sync_complete',
          title: 'Data Sync Completed',
          message: 'Successfully synced 45 new contracts',
          timestamp: new Date(Date.now() - 3600000),
          read: false
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'Matching Opportunity',
          message: '15 new contracts match your criteria',
          timestamp: new Date(Date.now() - 7200000),
          read: true
        }
      ];

      res.json({
        success: true,
        data: notifications
      });

    } catch (error) {
      logger.error('Notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }
}