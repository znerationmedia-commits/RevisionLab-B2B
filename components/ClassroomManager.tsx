import React, { useState, useEffect } from 'react';
import {
    Plus, Users, BookOpen, Loader2, Copy, CheckCircle2,
    ChevronDown, ChevronUp, Award, X, GraduationCap,
    FileText, Eye, ClipboardList, Trash2, CheckCircle,
    AlertCircle, MoreHorizontal
} from 'lucide-react';
import { CustomQuest } from '../types';

/* ─── tiny helpers ────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { label: string; cls: string }> = {
        completed: { label: '✓ Graded',        cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
        submitted: { label: '⏳ Needs Review',  cls: 'bg-amber-100  text-amber-700  border border-amber-200'  },
        pending:   { label: '○ Pending',        cls: 'bg-slate-100  text-slate-400  border border-slate-200'  },
    };
    const c = map[status] ?? map.pending;
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>;
};

/* ─── main component ──────────────────────────────────────────── */
export const ClassroomManager: React.FC = () => {
    const [classrooms, setClassrooms]         = useState<any[]>([]);
    const [quests,     setQuests]             = useState<CustomQuest[]>([]);
    const [isLoading,  setIsLoading]          = useState(false);
    const [isCreating, setIsCreating]         = useState(false);
    const [newName,    setNewName]            = useState('');
    const [assigningId,setAssigningId]        = useState<string|null>(null);
    const [selQuestId, setSelQuestId]         = useState('');
    const [aTitle,     setATitle]             = useState('');
    const [aDesc,      setADesc]              = useState('');
    const [copiedCode, setCopiedCode]         = useState<string|null>(null);
    const [expandedId, setExpandedId]         = useState<string|null>(null);
    const [panelTab, setPanelTab]             = useState<'assignments'|'performance'>('assignments');
    const [submissions,setSubmissions]        = useState<any[]>([]);
    const [grading,    setGrading]            = useState<Record<string,string>>({});
    const [proofModal, setProofModal]         = useState<string|null>(null);
    const [deletingSubId, setDeletingSubId]   = useState<string|null>(null);

    const token = () => localStorage.getItem('quest_token');
    const auth  = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` });

    /* fetch */
    const fetchClassrooms = async () => {
        setIsLoading(true);
        try {
            const r = await fetch('/api/classrooms', { headers: auth() });
            if (r.ok) { const d = await r.json(); setClassrooms(d.teaching||[]); }
        } catch(e){ console.error(e); }
        setIsLoading(false);
    };
    const fetchQuests = async () => {
        try { const r=await fetch('/api/quests'); if(r.ok) setQuests(await r.json()); } catch(e){}
    };
    const fetchSubs = async (classId:string) => {
        try {
            const r = await fetch(`/api/classrooms/${classId}/submissions`,{headers:auth()});
            if(r.ok) setSubmissions(await r.json());
        } catch(e){}
    };
    useEffect(()=>{ fetchClassrooms(); fetchQuests(); },[]);

    /* actions */
    const createClassroom = async () => {
        if(!newName.trim()) return;
        setIsLoading(true);
        const r = await fetch('/api/classrooms',{method:'POST',headers:auth(),body:JSON.stringify({name:newName})});
        if(r.ok){ setNewName(''); setIsCreating(false); fetchClassrooms(); }
        else alert('Failed to create classroom');
        setIsLoading(false);
    };

    const createAssignment = async () => {
        if(!assigningId||!aTitle) return alert('Title required');
        setIsLoading(true);
        const r = await fetch('/api/assignments',{method:'POST',headers:auth(),body:JSON.stringify({classroomId:assigningId,title:aTitle,description:aDesc,questId:selQuestId||''})});
        if(r.ok){ setAssigningId(null); setATitle(''); setADesc(''); setSelQuestId(''); fetchClassrooms(); }
        else alert('Failed to create assignment');
        setIsLoading(false);
    };

    const handleGrade = async (assignmentId:string, studentId:string) => {
        const score = grading[`${assignmentId}-${studentId}`];
        if(!score?.trim()) return alert('Enter a score');
        const r = await fetch(`/api/assignments/${assignmentId}/grade`,{method:'POST',headers:auth(),body:JSON.stringify({studentId,score:parseInt(score)})});
        if(r.ok){ if(expandedId) fetchSubs(expandedId); }
        else alert('Failed to grade');
    };

    const handleDeleteSub = async (subId:string) => {
        setDeletingSubId(subId);
        const r = await fetch(`/api/assignments/submissions/${subId}`,{method:'DELETE',headers:auth()});
        if(r.ok){
            setSubmissions(prev => prev.map(a=>({...a, submissions: a.submissions?.filter((s:any)=>s.id!==subId)})));
        } else alert('Failed to remove submission');
        setDeletingSubId(null);
    };

    const copyCode = (code:string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(()=>setCopiedCode(null), 2000);
    };

    if(isLoading && classrooms.length===0) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={36}/>
            <p className="text-sm font-semibold text-slate-400">Loading classrooms…</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-800">My Classrooms</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{classrooms.length} active {classrooms.length===1?'class':'classes'}</p>
                </div>
                <button onClick={()=>setIsCreating(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all">
                    <Plus size={16}/> New Classroom
                </button>
            </div>

            {/* ── Create classroom panel ── */}
            {isCreating && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-indigo-800 flex items-center gap-2"><GraduationCap size={16}/> New Classroom</p>
                        <button onClick={()=>setIsCreating(false)}><X size={16} className="text-slate-400"/></button>
                    </div>
                    <div className="flex gap-3">
                        <input type="text" placeholder="e.g., Form 4 Science A"
                            value={newName} onChange={e=>setNewName(e.target.value)}
                            onKeyDown={e=>e.key==='Enter'&&createClassroom()}
                            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none bg-white font-medium text-sm"/>
                        <button onClick={createClassroom} disabled={!newName.trim()||isLoading}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all">
                            {isLoading?<Loader2 size={15} className="animate-spin"/>:'Create'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Create assignment panel ── */}
            {assigningId && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-orange-800 flex items-center gap-2"><ClipboardList size={16}/> New Assignment</p>
                        <button onClick={()=>setAssigningId(null)}><X size={16} className="text-slate-400"/></button>
                    </div>
                    <input type="text" placeholder="Assignment title *"
                        value={aTitle} onChange={e=>setATitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:outline-none bg-white font-medium text-sm"/>
                    <textarea placeholder="Instructions (optional)" rows={2}
                        value={aDesc} onChange={e=>setADesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:outline-none bg-white font-medium text-sm resize-none"/>
                    <select value={selQuestId} onChange={e=>setSelQuestId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-200 bg-white font-medium text-sm">
                        <option value="">— Text assignment only —</option>
                        {quests.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}
                    </select>
                    <div className="flex justify-end gap-3">
                        <button onClick={()=>setAssigningId(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button onClick={createAssignment} disabled={!aTitle||isLoading}
                            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-sm shadow-orange-200 transition-all">
                            Assign to Class
                        </button>
                    </div>
                </div>
            )}

            {/* ── Empty state ── */}
            {classrooms.length===0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <GraduationCap size={36} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-bold text-slate-500">No classrooms yet</p>
                    <p className="text-sm text-slate-400 mt-1">Create your first classroom to start assigning work.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {classrooms.map(cls => {
                        const isExp = expandedId===cls.id;
                        const needsReview = isExp ? submissions.reduce((n,a)=>n+(a.submissions?.filter((s:any)=>s.status==='submitted').length||0),0) : 0;
                        return (
                            <div key={cls.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                {/* ── Classroom row ── */}
                                <div className="p-4 flex flex-wrap items-center gap-3">
                                    {/* Avatar + name */}
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                        <GraduationCap size={20} className="text-indigo-600"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-extrabold text-slate-800 text-base leading-tight truncate">{cls.name}</h4>
                                        <div className="flex gap-3 text-xs font-semibold text-slate-400 mt-0.5">
                                            <span className="flex items-center gap-1"><Users size={11}/>{cls._count?.students||0} students</span>
                                            <span className="flex items-center gap-1"><ClipboardList size={11}/>{cls._count?.assignments||0} assignments</span>
                                            {isExp && needsReview>0 && <span className="flex items-center gap-1 text-amber-500"><AlertCircle size={11}/>{needsReview} need review</span>}
                                        </div>
                                    </div>

                                    {/* Join code */}
                                    <div className="shrink-0 text-center">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Join Code</p>
                                        <button onClick={()=>copyCode(cls.joinCode)}
                                            className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-xl font-mono font-extrabold text-indigo-600 text-sm transition-all">
                                            {cls.joinCode}
                                            {copiedCode===cls.joinCode
                                                ? <CheckCircle2 size={12} className="text-emerald-500"/>
                                                : <Copy size={12} className="text-slate-400"/>}
                                        </button>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={()=>setAssigningId(cls.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50 transition-all">
                                            <Plus size={13}/> Assign
                                        </button>
                                        <button onClick={()=>{
                                            if(isExp){ setExpandedId(null); }
                                            else { setExpandedId(cls.id); setPanelTab('assignments'); fetchSubs(cls.id); }
                                        }} className="flex items-center gap-1 px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all">
                                            <Eye size={13}/>
                                            {isExp?'Hide':'Submissions'}
                                            {isExp?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                                        </button>
                                    </div>
                                </div>

                                {/* ── Submissions & Performance panel ── */}
                                {isExp && (() => {
                                    const studentStats: Record<string, {name:string, totalScore:number, gradedCount:number, totalCompleted:number}> = {};
                                    submissions.forEach(a => {
                                        a.submissions?.forEach((sub:any) => {
                                            if (!studentStats[sub.studentId]) studentStats[sub.studentId] = { name: sub.student?.name || 'Unknown', totalScore: 0, gradedCount: 0, totalCompleted: 0 };
                                            if (sub.status === 'completed') {
                                                studentStats[sub.studentId].totalCompleted += 1;
                                                if (sub.score != null) {
                                                    studentStats[sub.studentId].totalScore += sub.score;
                                                    studentStats[sub.studentId].gradedCount += 1;
                                                }
                                            }
                                        });
                                    });
                                    const roster = Object.values(studentStats)
                                        .map(s => ({
                                            name: s.name,
                                            completed: s.totalCompleted,
                                            accuracy: s.gradedCount > 0 ? Math.round(s.totalScore / s.gradedCount) : 0
                                        }))
                                        .sort((a,b) => b.accuracy - a.accuracy);

                                    return (
                                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                                            {/* Tab selector */}
                                            <div className="flex gap-2 bg-slate-200/50 p-1 rounded-xl w-fit">
                                                <button onClick={()=>setPanelTab('assignments')}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${panelTab==='assignments'?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                                                    <ClipboardList size={14}/> Assignments & Grading
                                                </button>
                                                <button onClick={()=>setPanelTab('performance')}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${panelTab==='performance'?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                                                    <Award size={14}/> Student Performance
                                                </button>
                                            </div>

                                            {panelTab === 'assignments' ? (
                                                submissions.length===0 ? (
                                                    <div className="text-center py-8 text-slate-400">
                                                        <FileText size={24} className="mx-auto mb-2 opacity-30"/>
                                                        <p className="text-sm font-semibold">No assignments yet.</p>
                                                    </div>
                                                ) : (
                                                    submissions.map(a => {
                                                        const total  = a.submissions?.length||0;
                                                        const graded = a.submissions?.filter((s:any)=>s.status==='completed').length||0;
                                                        const hasPending = a.submissions?.some((s:any)=>s.status==='submitted');
                                                        return (
                                                            <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
                                                                {/* assignment header */}
                                                                <div className={`px-4 py-2.5 flex items-center justify-between ${hasPending?'bg-amber-50 border-b border-amber-100':'bg-slate-50 border-b border-slate-100'}`}>
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <BookOpen size={13} className="text-indigo-400 shrink-0"/>
                                                                        <span className="font-bold text-sm text-slate-800 truncate">{a.title}</span>
                                                                        {!a.questId && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 rounded font-bold shrink-0">Text</span>}
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-2">{graded}/{total} graded</span>
                                                                </div>

                                                                {/* student rows */}
                                                                {total===0 ? (
                                                                    <p className="text-xs text-slate-400 italic px-4 py-3">No submissions yet.</p>
                                                                ) : (
                                                                    <div className="divide-y divide-slate-50">
                                                                        {a.submissions.map((sub:any) => {
                                                                            const key = `${a.id}-${sub.studentId}`;
                                                                            const cur = grading[key] ?? (sub.score!=null ? String(sub.score) : '');
                                                                            const isDeleting = deletingSubId===sub.id;
                                                                            return (
                                                                                <div key={sub.id} className="grid grid-cols-12 px-4 py-2.5 items-center gap-2 hover:bg-slate-50 transition-colors">
                                                                                    {/* student */}
                                                                                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                                                                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                                                            <span className="text-[10px] font-extrabold text-indigo-600">
                                                                                                {(sub.student?.name||'S').charAt(0).toUpperCase()}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-sm font-bold text-slate-700 truncate">{sub.student?.name||'Student'}</span>
                                                                                    </div>
                                                                                    {/* status */}
                                                                                    <div className="col-span-2"><StatusBadge status={sub.status||'pending'}/></div>
                                                                                    {/* proof */}
                                                                                    <div className="col-span-2">
                                                                                        {sub.proofUrl ? (
                                                                                            <button onClick={()=>setProofModal(sub.proofUrl)} className="group relative">
                                                                                                <img src={sub.proofUrl} alt="Proof"
                                                                                                    className="w-8 h-8 object-cover rounded-lg border-2 border-indigo-200 group-hover:border-indigo-400 transition-all"/>
                                                                                            </button>
                                                                                        ) : <span className="text-[10px] text-slate-300">—</span>}
                                                                                    </div>
                                                                                    {/* score */}
                                                                                    <div className="col-span-3 flex items-center gap-1.5">
                                                                                        <input type="number" placeholder="0-100" value={cur} min="0" max="100"
                                                                                            onChange={e=>setGrading({...grading,[key]:e.target.value})}
                                                                                            className="w-16 px-2 py-1.5 text-center text-xs font-bold rounded-lg border-2 border-slate-200 focus:border-indigo-400 focus:outline-none"/>
                                                                                        <button onClick={()=>handleGrade(a.id,sub.studentId)}
                                                                                            className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all">
                                                                                            Save
                                                                                        </button>
                                                                                    </div>
                                                                                    {/* dismiss */}
                                                                                    <div className="col-span-1 flex justify-end">
                                                                                        <button
                                                                                            onClick={()=>handleDeleteSub(sub.id)}
                                                                                            disabled={isDeleting}
                                                                                            title="Remove submission"
                                                                                            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40">
                                                                                            {isDeleting ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )
                                            ) : (
                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="font-bold text-sm text-slate-800">Leaderboard & Accuracy</span>
                                                    </div>
                                                    {roster.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic px-4 py-6 text-center">No graded submissions yet to calculate accuracy.</p>
                                                    ) : (
                                                        <div className="divide-y divide-slate-50">
                                                            {roster.map((student, idx) => (
                                                                <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs
                                                                            ${idx===0?'bg-amber-100 text-amber-600':idx===1?'bg-slate-200 text-slate-600':idx===2?'bg-orange-100 text-orange-600':'bg-indigo-50 text-indigo-500'}`}>
                                                                            #{idx+1}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-700">{student.name}</p>
                                                                            <p className="text-[10px] font-semibold text-slate-400">{student.completed} assignments completed</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={`text-lg font-extrabold ${student.accuracy >= 80 ? 'text-emerald-500' : student.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                                            {student.accuracy}%
                                                                        </p>
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Proof modal ── */}
            {proofModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={()=>setProofModal(null)}>
                    <div className="relative max-w-lg w-full" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setProofModal(null)} className="absolute -top-9 right-0 text-white/80 hover:text-white text-sm font-bold flex items-center gap-1">
                            <X size={15}/> Close
                        </button>
                        <img src={proofModal} alt="Proof" className="w-full rounded-2xl shadow-2xl border-4 border-white/10"/>
                    </div>
                </div>
            )}
        </div>
    );
};
