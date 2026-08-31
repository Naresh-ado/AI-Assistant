import express from 'express';
import { authMiddleware } from './auth.js';
import { dbStore } from '../store.js';

const router = express.Router();

// Filter entities (POST /api/entities/:entity/filter)
router.post('/:entity/filter', authMiddleware, async (req, res) => {
  try {
    const { query = {}, sort = '-created_date', limit = 100 } = req.body;
    
    if (query.created_by_id === '$me' || query.created_by_id === req.user.id) {
      query.created_by_id = req.user.id;
    }

    const items = await dbStore.filterEntities(req.params.entity, query, sort, limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk create entities (POST /api/entities/:entity/bulk-create)
router.post('/:entity/bulk-create', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const payload = items.map(item => ({ ...item, created_by_id: req.user.id }));
    const created = await dbStore.bulkCreateEntities(req.params.entity, payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update entities (PATCH /api/entities/:entity/bulk-update)
router.patch('/:entity/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array is required' });
    }
    const result = await dbStore.bulkUpdateEntities(req.params.entity, updates);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete entities (DELETE /api/entities/:entity/bulk-delete)
router.delete('/:entity/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'object') {
      return res.status(400).json({ error: 'query object is required' });
    }
    const result = await dbStore.bulkDeleteEntities(req.params.entity, query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create entity (POST /api/entities/:entity)
router.post('/:entity', authMiddleware, async (req, res) => {
  try {
    const payload = { ...req.body, created_by_id: req.user.id };
    const item = await dbStore.createEntity(req.params.entity, payload);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get entity by ID (GET /api/entities/:entity/:id)
router.get('/:entity/:id', authMiddleware, async (req, res) => {
  try {
    const item = await dbStore.getEntityById(req.params.entity, req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update entity (PUT/PATCH /api/entities/:entity/:id)
const updateHandler = async (req, res) => {
  try {
    const item = await dbStore.updateEntity(req.params.entity, req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
router.put('/:entity/:id', authMiddleware, updateHandler);
router.patch('/:entity/:id', authMiddleware, updateHandler);

// Delete entity (DELETE /api/entities/:entity/:id)
router.delete('/:entity/:id', authMiddleware, async (req, res) => {
  try {
    await dbStore.deleteEntity(req.params.entity, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
