import React, { useState, useEffect } from 'react';
import {
    Plus, Pencil, Trash2, Loader2, Gift, Coins, Package,
    X, Check, Eye, EyeOff, AlertCircle, ToggleLeft, ToggleRight,
    Star, Sparkles, ShoppingBag, Zap
} from 'lucide-react';

interface Reward {
    id: string;
    title: string;
    description: string;
    icon: string;
    imageUrl: string | null;
    coinCost: number;
    stock: number | null;
    isActive: boolean;
}

const EMOJI_PRESETS = ['🎁','🏆','⭐','🎖️','🍕','🎮','📚','🎧','💡','🏅','🎨','🛍️','🎯','🍦','🧸','🎪','🌟','🦋'];
const defaultForm = { title:'', description:'', icon:'🎁', coinCost:'', stock:'', imageUrl:'' };

interface Toast { msg: string; type: 'success'|'error' }

/* ─── Stat chip ───────────────────────────────────────────────── */
const Chip: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${color}`}>
        <span className="opacity-70">{icon}</span>
        <div>
            <p className="text-xl font-extrabold leading-none">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
        </div>
    </div>
);

/* ─── Reward card ─────────────────────────────────────────────── */
const RewardCard: React.FC<{
    reward: Reward;
    onEdit: (r: Reward) => void;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}> = ({ reward, onEdit, onToggle, onDelete }) => {
    const outOfStock = reward.stock !== null && reward.stock <= 0;
    const stockLabel = outOfStock ? 'Sold Out' : reward.stock !== null ? `${reward.stock} left` : '∞ Unlimited';
    const stockColor = outOfStock ? 'bg-red-100 text-red-500' : reward.stock !== null ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600';

    return (
        <div className={`group relative bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-lg overflow-hidden
            ${reward.isActive ? 'border-slate-200 hover:border-amber-300' : 'border-dashed border-slate-200 opacity-60'}`}>

            {/* Active indicator strip */}
            {reward.isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400"/>}

            {/* Image / Emoji hero */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                    {reward.imageUrl
                        ? <img src={reward.imageUrl} alt={reward.title} className="w-12 h-12 object-cover rounded-lg"/>
                        : reward.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-base leading-tight truncate">{reward.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">{reward.description}</p>
                </div>
            </div>

            {/* Stats row */}
            <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 font-extrabold text-amber-600 text-sm bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl">
                    <Coins size={13} className="text-amber-400"/> {reward.coinCost.toLocaleString()}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl ${stockColor}`}>{stockLabel}</span>
                <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-xl ${reward.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                    {reward.isActive ? '● Live' : '○ Hidden'}
                </span>
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-2">
                <button onClick={() => onToggle(reward.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${reward.isActive ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-700'}`}>
                    {reward.isActive ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
                    {reward.isActive ? 'Active' : 'Hidden'}
                </button>
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onEdit(reward)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                        <Pencil size={13}/>
                    </button>
                    <button onClick={() => onDelete(reward.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 size={13}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main component ──────────────────────────────────────────── */
const TeacherRewardsManager: React.FC = () => {
    const [rewards,       setRewards]       = useState<Reward[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [saving,        setSaving]        = useState(false);
    const [showForm,      setShowForm]      = useState(false);
    const [editingId,     setEditingId]     = useState<string|null>(null);
    const [form,          setForm]          = useState({ ...defaultForm });
    const [toast,         setToast]         = useState<Toast|null>(null);
    const [deleteId,      setDeleteId]      = useState<string|null>(null);
    const [filterTab,     setFilterTab]     = useState<'all'|'active'|'hidden'>('all');

    const token       = localStorage.getItem('quest_token');
    const authHeaders = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' };

    const showToast = (msg: string, type: Toast['type']) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetch_rewards = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/rewards/all', { headers: authHeaders });
            if (r.ok) setRewards(await r.json());
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { fetch_rewards(); }, []);

    const openCreate = () => { setEditingId(null); setForm({ ...defaultForm }); setShowForm(true); };
    const openEdit   = (r: Reward) => {
        setEditingId(r.id);
        setForm({ title: r.title, description: r.description, icon: r.icon, coinCost: String(r.coinCost), stock: r.stock!=null?String(r.stock):'', imageUrl: r.imageUrl||'' });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.description.trim() || !form.coinCost) return showToast('Title, description & coin cost required.', 'error');
        setSaving(true);
        try {
            const payload = { title:form.title.trim(), description:form.description.trim(), icon:form.icon, coinCost:form.coinCost, stock:form.stock, imageUrl:form.imageUrl.trim()||null };
            const r = editingId
                ? await fetch(`/api/rewards/${editingId}`,{ method:'PUT',  headers:authHeaders, body:JSON.stringify(payload) })
                : await fetch('/api/rewards',              { method:'POST', headers:authHeaders, body:JSON.stringify(payload) });
            if (r.ok) { showToast(editingId?'Reward updated!':'Reward created! 🎉','success'); setShowForm(false); fetch_rewards(); }
            else { const e=await r.json(); showToast(e.error||'Failed','error'); }
        } catch { showToast('Network error','error'); }
        setSaving(false);
    };

    const handleToggle = async (id: string) => {
        try {
            const r = await fetch(`/api/rewards/${id}/toggle`,{ method:'PATCH', headers:authHeaders });
            if (r.ok) { const u=await r.json(); setRewards(p=>p.map(x=>x.id===id?u:x)); showToast(u.isActive?'Reward is now live 🟢':'Reward hidden','success'); }
        } catch { showToast('Failed to toggle','error'); }
    };

    const handleDelete = async (id: string) => {
        try {
            const r = await fetch(`/api/rewards/${id}`,{ method:'DELETE', headers:authHeaders });
            if (r.ok) { setRewards(p=>p.filter(x=>x.id!==id)); showToast('Reward deleted','success'); }
            else showToast('Failed to delete','error');
        } catch { showToast('Network error','error'); }
        setDeleteId(null);
    };

    const active   = rewards.filter(r=>r.isActive);
    const hidden   = rewards.filter(r=>!r.isActive);
    const filtered = filterTab==='active' ? active : filterTab==='hidden' ? hidden : rewards;

    return (
        <div className="space-y-6 relative">
            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl font-bold text-white text-sm
                    ${toast.type==='success'?'bg-emerald-500':'bg-red-500'}`}>
                    {toast.type==='success'?<Check size={15}/>:<AlertCircle size={15}/>} {toast.msg}
                </div>
            )}

            {/* ── Hero header ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-200">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"/>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"/>
                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Gift size={20}/>
                            <h3 className="text-xl font-extrabold">Rewards Catalog</h3>
                        </div>
                        <p className="text-amber-100 text-sm font-medium">Motivate your students with exciting rewards</p>
                        <div className="flex items-center gap-4 mt-3">
                            <div className="text-center">
                                <p className="text-2xl font-extrabold">{rewards.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Total</p>
                            </div>
                            <div className="w-px h-8 bg-white/20"/>
                            <div className="text-center">
                                <p className="text-2xl font-extrabold">{active.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Live</p>
                            </div>
                            <div className="w-px h-8 bg-white/20"/>
                            <div className="text-center">
                                <p className="text-2xl font-extrabold">{hidden.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Hidden</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 bg-white text-amber-600 hover:bg-amber-50 px-5 py-2.5 rounded-xl font-extrabold text-sm shadow-md transition-all active:scale-95 shrink-0">
                        <Plus size={16}/> New Reward
                    </button>
                </div>
            </div>

            {/* ── Filter tabs ── */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {(['all','active','hidden'] as const).map(t=>(
                    <button key={t} onClick={()=>setFilterTab(t)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${filterTab===t?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                        {t==='all'?`All (${rewards.length})`:t==='active'?`Live (${active.length})`:`Hidden (${hidden.length})`}
                    </button>
                ))}
            </div>

            {/* ── Grid ── */}
            {loading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                    <Loader2 className="animate-spin text-amber-500" size={28}/>
                    <span className="text-slate-400 font-semibold">Loading rewards…</span>
                </div>
            ) : filtered.length===0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <div className="text-5xl mb-3">🎁</div>
                    <h4 className="font-bold text-slate-600 mb-1">{filterTab==='all'?'No rewards yet':filterTab==='active'?'No live rewards':'No hidden rewards'}</h4>
                    <p className="text-sm text-slate-400">
                        {filterTab==='all'?'Create your first reward to motivate students!':filterTab==='active'?'Activate a reward so students can redeem it.':'All rewards are currently live.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(r=>(
                        <RewardCard key={r.id} reward={r} onEdit={openEdit} onToggle={handleToggle} onDelete={setDeleteId}/>
                    ))}
                </div>
            )}

            {/* ── Create / Edit modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5" onClick={e=>e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-extrabold text-slate-800">{editingId?'Edit Reward':'New Reward'}</h4>
                                <p className="text-xs text-slate-400">{editingId?'Update the reward details below':'Fill in the details to create a reward'}</p>
                            </div>
                            <button onClick={()=>setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                <X size={18}/>
                            </button>
                        </div>

                        {/* Emoji preview + picker */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Icon</label>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-sm">
                                    {form.icon}
                                </div>
                                <p className="text-xs text-slate-400">Click an emoji to select it as the reward icon</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {EMOJI_PRESETS.map(e=>(
                                    <button key={e} onClick={()=>setForm(f=>({...f,icon:e}))}
                                        className={`text-xl w-9 h-9 rounded-xl border-2 transition-all ${form.icon===e?'border-amber-400 bg-amber-50 shadow-sm scale-110':'border-slate-200 hover:border-amber-200 hover:bg-amber-50'}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Title *</label>
                            <input type="text" placeholder="e.g., Pizza Voucher 🍕"
                                value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-semibold text-sm"/>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description *</label>
                            <textarea placeholder="What does the student get?" rows={2}
                                value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-sm resize-none"/>
                        </div>

                        {/* Cost + Stock row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Coin Cost *</label>
                                <div className="relative">
                                    <Coins size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400"/>
                                    <input type="number" placeholder="e.g. 500" min="1"
                                        value={form.coinCost} onChange={e=>setForm(f=>({...f,coinCost:e.target.value}))}
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-bold text-sm"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Stock (blank = ∞)</label>
                                <div className="relative">
                                    <Package size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input type="number" placeholder="Unlimited" min="0"
                                        value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-sm"/>
                                </div>
                            </div>
                        </div>

                        {/* Image URL */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Image URL <span className="normal-case text-slate-300">(optional — overrides emoji)</span></label>
                            <input type="url" placeholder="https://…"
                                value={form.imageUrl} onChange={e=>setForm(f=>({...f,imageUrl:e.target.value}))}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-none font-medium text-sm"/>
                        </div>

                        {/* Preview bar */}
                        {form.title && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                                <span className="text-2xl">{form.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-sm text-slate-800 truncate">{form.title}</p>
                                    <p className="text-xs text-amber-600 font-bold flex items-center gap-1"><Coins size={10}/>{form.coinCost||'?'} coins</p>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2">
                                {saving?<Loader2 size={15} className="animate-spin"/>:<Sparkles size={15}/>}
                                {saving?'Saving…':editingId?'Save Changes':'Create Reward'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirm ── */}
            {deleteId && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setDeleteId(null)}/>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 size={22} className="text-red-500"/>
                        </div>
                        <h4 className="font-extrabold text-slate-800">Delete this reward?</h4>
                        <p className="text-sm text-slate-500">Students who already redeemed it keep their redemptions. This can't be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all">Keep it</button>
                            <button onClick={()=>handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherRewardsManager;
