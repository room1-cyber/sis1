import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, User, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface StudentSearchProps {
  onSelect: (student: { uid: string; displayName: string; tuition?: number }) => void;
  selectedId?: string;
  placeholder?: string;
  className?: string;
}

export default function StudentSearch({ onSelect, selectedId, placeholder = "Search students...", className }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedId) {
      const fetchSelected = async () => {
        const q = query(collection(db, 'users'), where('uid', '==', selectedId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSelectedStudent({ uid: snap.docs[0].id, ...snap.docs[0].data() });
        }
      };
      fetchSelected();
    } else {
      setSelectedStudent(null);
    }
  }, [selectedId]);

  useEffect(() => {
    const searchStudents = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Firestore doesn't support full-text search well, so we use a prefix search trick
        // This works for displayName if it starts with the search term
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          orderBy('displayName'),
          startAt(searchTerm),
          endAt(searchTerm + '\uf8ff'),
          limit(10)
        );

        const snap = await getDocs(q);
        const students = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setResults(students);
      } catch (error) {
        console.error("Error searching students:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchStudents, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={selectedStudent ? selectedStudent.displayName : searchTerm}
          onChange={(e) => {
            if (selectedStudent) {
              setSelectedStudent(null);
              onSelect({ uid: '', displayName: '' });
            }
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
        />
        {(searchTerm || selectedStudent) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStudent(null);
              onSelect({ uid: '', displayName: '' });
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (searchTerm.length >= 2 || loading) && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {results.map((student) => (
                <button
                  key={student.uid}
                  onClick={() => {
                    setSelectedStudent(student);
                    onSelect({ uid: student.uid, displayName: student.displayName, tuition: student.tuition });
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{student.displayName}</p>
                      <p className="text-xs text-slate-500">{student.email || student.nationalId}</p>
                    </div>
                  </div>
                  {selectedId === student.uid && <Check className="w-5 h-5 text-blue-600" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <User className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">No students found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
