import mongoose from 'mongoose';

// In-Memory Storage Fallback when MongoDB service is not connected
const memoryStore = {
  User: [],
  StudentProfile: [],
  Course: [],
  Topic: [],
  AcademicTask: [],
  StudyPlan: [],
  PlanSession: [],
  CompanionMessage: []
};

let idCounter = 1000;
const generateId = () => (idCounter++).toString();

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const dbStore = {
  // USER AUTH METHODS
  findUserByEmail: async (email) => {
    if (isDbConnected()) {
      const { User } = await import('./models/User.js');
      return await User.findOne({ email });
    }
    return memoryStore.User.find(u => u.email === email) || null;
  },

  findUserById: async (id) => {
    if (isDbConnected()) {
      const { User } = await import('./models/User.js');
      return await User.findById(id);
    }
    return memoryStore.User.find(u => u.id === id) || null;
  },

  createUser: async ({ email, password, full_name }) => {
    if (isDbConnected()) {
      const { User } = await import('./models/User.js');
      return await User.create({ email, password, full_name });
    }
    const newUser = {
      id: generateId(),
      email,
      password,
      full_name: full_name || '',
      created_date: new Date()
    };
    memoryStore.User.push(newUser);
    const { password: _, ...userWithoutPass } = newUser;
    return userWithoutPass;
  },

  // GENERIC ENTITY METHODS
  filterEntities: async (entityName, query = {}, sort = '-created_date', limit = 100) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      let sortObj = {};
      if (typeof sort === 'string') {
        if (sort.startsWith('-')) sortObj[sort.substring(1)] = -1;
        else sortObj[sort] = 1;
      } else sortObj = sort;

      // Normalize array query params for Mongo ($in)
      const mongoQuery = {};
      for (const k in query) {
        if (Array.isArray(query[k])) {
          mongoQuery[k] = { $in: query[k] };
        } else {
          mongoQuery[k] = query[k];
        }
      }
      return await Model.find(mongoQuery).sort(sortObj).limit(limit);
    }
    
    let items = (memoryStore[entityName] || []).filter(item => {
      for (let k in query) {
        if (Array.isArray(query[k])) {
          if (!query[k].includes(item[k])) return false;
        } else if (item[k] !== query[k]) {
          return false;
        }
      }
      return true;
    });

    // Handle sort for in-memory
    if (typeof sort === 'string') {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      items = [...items].sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    return items.slice(0, limit);
  },

  createEntity: async (entityName, data) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.create(data);
    }
    const newItem = {
      id: generateId(),
      ...data,
      created_date: new Date()
    };
    if (!memoryStore[entityName]) memoryStore[entityName] = [];
    memoryStore[entityName].push(newItem);
    return newItem;
  },

  getEntityById: async (entityName, id) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.findById(id);
    }
    const items = memoryStore[entityName] || [];
    return items.find(i => i.id === id) || null;
  },

  updateEntity: async (entityName, id, data) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.findByIdAndUpdate(id, data, { new: true });
    }
    const items = memoryStore[entityName] || [];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data };
    return items[index];
  },

  deleteEntity: async (entityName, id) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.findByIdAndDelete(id);
    }
    if (memoryStore[entityName]) {
      memoryStore[entityName] = memoryStore[entityName].filter(i => i.id !== id);
    }
    return { success: true };
  },

  // BULK OPERATIONS
  bulkCreateEntities: async (entityName, items) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.insertMany(items);
    }
    if (!memoryStore[entityName]) memoryStore[entityName] = [];
    const created = items.map(data => ({
      id: generateId(),
      ...data,
      created_date: new Date()
    }));
    memoryStore[entityName].push(...created);
    return created;
  },

  bulkUpdateEntities: async (entityName, updates) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      const ops = updates.map(({ id, ...data }) => ({
        updateOne: { filter: { _id: id }, update: { $set: data } }
      }));
      return await Model.bulkWrite(ops);
    }
    const items = memoryStore[entityName] || [];
    const results = [];
    for (const { id, ...data } of updates) {
      const index = items.findIndex(i => i.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data };
        results.push(items[index]);
      }
    }
    return results;
  },

  bulkDeleteEntities: async (entityName, query) => {
    if (isDbConnected()) {
      const models = await import(`./models/${entityName}.js`);
      const Model = models[entityName];
      return await Model.deleteMany(query);
    }
    if (!memoryStore[entityName]) return { deletedCount: 0 };
    const before = memoryStore[entityName].length;
    memoryStore[entityName] = memoryStore[entityName].filter(item => {
      for (let k in query) {
        if (Array.isArray(query[k])) {
          if (query[k].includes(item[k])) return false;
        } else if (item[k] === query[k]) {
          return false;
        }
      }
      return true;
    });
    return { deletedCount: before - memoryStore[entityName].length };
  }
};
