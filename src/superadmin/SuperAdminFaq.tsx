import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { FaqItem } from '../lib/firebase';
import { FaqManager, FAQ_CATEGORIES } from '../components/HelpView';
import { SEED_FAQS } from '../lib/constants';

const GLOBAL_FAQ = collection(db, 'global/faq');

export function SuperAdminFaq() {
  const [items, setItems] = useState<FaqItem[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'global', 'faq'), snap => {
      const f = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FaqItem))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setItems(f);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (item: Omit<FaqItem, 'id'>) => {
    const id = `faq_${Date.now()}`;
    await setDoc(doc(db, 'global', 'faq', id), item);
  };

  const handleUpdate = async (item: FaqItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'global', 'faq', id), data);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'global', 'faq', id));
  };

  const handleReset = async () => {
    const batch = writeBatch(db);
    items.forEach(item => batch.delete(doc(db, 'global', 'faq', item.id)));
    SEED_FAQS.forEach(({ id, ...data }) => batch.set(doc(db, 'global', 'faq', id), data));
    await batch.commit();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black text-white">Global FAQ</h2>
        <p className="text-sm text-slate-400 mt-1">
          These FAQ items appear in the Help section for all team hubs. Teams can add their own additional items.
        </p>
      </div>
      <FaqManager
        items={items}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReset={handleReset}
      />
    </div>
  );
}
