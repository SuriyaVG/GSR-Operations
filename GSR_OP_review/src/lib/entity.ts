// src/lib/entity.ts

// A simple function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// The factory function that creates our mock entity models
export function createEntity<T extends { id?: string }>(entityName: string) {
  const getStorageKey = () => `db_${entityName}`;

  const list = async (sort?: string, limit?: number): Promise<T[]> => {
    const key = getStorageKey();
    const itemsJson = localStorage.getItem(key);
    let items: T[] = itemsJson ? JSON.parse(itemsJson) : [];

    // Basic sorting (e.g., '-created_date')
    if (sort) {
      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.substring(1) : sort;
      items.sort((a, b) => {
        if (a[sortField] < b[sortField]) return isDesc ? 1 : -1;
        if (a[sortField] > b[sortField]) return isDesc ? -1 : 1;
        return 0;
      });
    }

    if (limit) {
      items = items.slice(0, limit);
    }

    return items;
  };

  const create = async (data: Omit<T, 'id'>): Promise<T> => {
    const allItems = await list();
    const newItem: T = {
      id: generateId(),
      created_date: new Date().toISOString(),
      ...data,
    } as T;
    
    allItems.push(newItem);
    localStorage.setItem(getStorageKey(), JSON.stringify(allItems));
    return newItem;
  };

  const find = async (id: string): Promise<T | undefined> => {
    const allItems = await list();
    return allItems.find((item) => item.id === id);
  };
  
  const filter = async (query: Partial<T>): Promise<T[]> => {
    const allItems = await list();
    return allItems.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  };

  return {
    list,
    create,
    find,
    filter,
  };
} 