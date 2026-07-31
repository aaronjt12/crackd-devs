import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router = Router();
const controller = new SearchController();

// Search endpoints for frontend
router.post('/contracts', controller.searchContracts);
router.get('/filters', controller.getFilterOptions);
router.get('/trending', controller.getTrending);
router.get('/contract/:awardId', controller.getContractDetails);

export default router;