import { Router } from 'express';
import { ContractsController } from '../controllers/contracts.controller';

const router = Router();
const controller = new ContractsController();

router.get('/', controller.getContracts);
router.get('/stats/naics', controller.getContractsByNAICS);
router.get('/stats/agency', controller.getContractsByAgency);
router.get('/:id', controller.getContract);

export default router;