import { isLiveSupabase, supabase } from '../lib/supabase';
import { Person } from '../types';
import { initialPersons } from './mockData';
import { auditService } from './audit.service';

export const personsService = {
  async getPersons(): Promise<Person[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return (data as Person[]) || [];
    }

    const stored = localStorage.getItem('epg_persons');
    if (!stored) {
      localStorage.setItem('epg_persons', JSON.stringify(initialPersons));
      return initialPersons;
    }
    return JSON.parse(stored);
  },

  async getPersonById(id: string): Promise<Person | null> {
    const persons = await this.getPersons();
    return persons.find((p) => p.id === id) || null;
  },

  async createPerson(payload: Omit<Person, 'id' | 'created_at' | 'updated_at'>): Promise<Person> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('persons').insert(payload as any).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'PERSON_CREATED', entity_type: 'person', entity_id: (data as any).id, new_values: data });
      return data as Person;
    }

    const persons = await this.getPersons();
    const newPerson: Person = {
      ...payload,
      id: `person-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    persons.push(newPerson);
    localStorage.setItem('epg_persons', JSON.stringify(persons));
    await auditService.logAction({ action: 'PERSON_CREATED', entity_type: 'person', entity_id: newPerson.id, new_values: newPerson });
    return newPerson;
  },

  async updatePerson(id: string, payload: Partial<Person>): Promise<Person> {
    if (isLiveSupabase) {
      const { data, error } = await (supabase as any).from('persons').update(payload as any).eq('id', id).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'PERSON_UPDATED', entity_type: 'person', entity_id: id, new_values: payload });
      return data as Person;
    }

    const persons = await this.getPersons();
    const idx = persons.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Persona no encontrada');
    const oldValues = persons[idx];
    const updated = { ...persons[idx], ...payload, updated_at: new Date().toISOString() };
    persons[idx] = updated;
    localStorage.setItem('epg_persons', JSON.stringify(persons));
    await auditService.logAction({ action: 'PERSON_UPDATED', entity_type: 'person', entity_id: id, old_values: oldValues, new_values: payload });
    return updated;
  },
};
