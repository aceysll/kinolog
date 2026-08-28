import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './AddToListModal.css';

export default function AddToListModal({ title, onClose }) {
  const [lists, setLists] = useState([]);
  const [memberListIds, setMemberListIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: userLists, error: listsError } = await supabase
      .from('lists')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (listsError) {
      alert('Failed to load lists: ' + listsError.message);
      setLoading(false);
      return;
    }

    const { data: existingItems, error: itemsError } = await supabase
      .from('list_items')
      .select('list_id')
      .eq('source', title.source)
      .eq('external_id', String(title.external_id));

    if (itemsError) {
      alert('Failed to load list membership: ' + itemsError.message);
    }

    setLists(userLists || []);
    setMemberListIds(new Set((existingItems || []).map(i => i.list_id)));
    setLoading(false);
  }

  async function toggleList(list) {
    const isMember = memberListIds.has(list.id);

    if (isMember) {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', list.id)
        .eq('source', title.source)
        .eq('external_id', String(title.external_id));

      if (error) {
        alert('Failed to remove from list: ' + error.message);
        return;
      }

      const next = new Set(memberListIds);
      next.delete(list.id);
      setMemberListIds(next);
    } else {
      const { error } = await supabase
        .from('list_items')
        .insert({
          list_id: list.id,
          source: title.source,
          external_id: String(title.external_id),
          media_type: title.media_type,
          title: title.title,
          poster_path: title.poster_url || null,
          year: title.year || null
        });

      if (error) {
        alert('Failed to add to list: ' + error.message);
        return;
      }

      const next = new Set(memberListIds);
      next.add(list.id);
      setMemberListIds(next);
    }
  }

  async function createList() {
    const name = newListName.trim();
    if (!name) return;

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('lists')
      .insert({ user_id: user.id, name })
      .select('id, name')
      .single();

    setCreating(false);

    if (error) {
      alert('Failed to create list: ' + error.message);
      return;
    }

    setLists([data, ...lists]);
    setNewListName('');
  }

  return (
    <div className="atl-overlay" onClick={onClose}>
      <div className="atl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="atl-header">
          <span className="atl-title">Add to list</span>
          <button className="atl-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="atl-loading">Loading lists...</div>
        ) : (
          <>
            <div className="atl-list-items">
              {lists.length === 0 && (
                <div className="atl-empty">No lists yet, create one below.</div>
              )}
              {lists.map(list => (
                <label key={list.id} className="atl-list-row">
                  <input
                    type="checkbox"
                    checked={memberListIds.has(list.id)}
                    onChange={() => toggleList(list)}
                  />
                  <span>{list.name}</span>
                </label>
              ))}
            </div>

            <div className="atl-create">
              <input
                type="text"
                placeholder="New list name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
              />
              <button onClick={createList} disabled={creating || !newListName.trim()}>
                {creating ? '...' : 'Create'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
