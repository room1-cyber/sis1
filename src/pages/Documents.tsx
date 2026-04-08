import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Search,
  Filter,
  Eye,
  MoreVertical,
  FileUp,
  ShieldCheck,
  X,
  File,
  Plus,
  Shield,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

export default function Documents() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'verified'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  const [uploadData, setUploadData] = useState({
    name: '',
    type: 'Academic',
    file: null as any
  });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'documents'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'documents'));
    return () => unsubscribe();
  }, [profile]);

  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'all') return true;
    return doc.status === activeTab;
  });

  const handleUpload = async () => {
    if (!profile || !uploadData.name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'documents'), {
        name: uploadData.name,
        type: uploadData.type,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        size: '1.0 MB', // Mock size for now as we don't have real storage
        userId: profile.uid,
        createdAt: serverTimestamp()
      });
      setIsUploadModalOpen(false);
      setUploadData({ name: '', type: 'Academic', file: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
          <p className="text-slate-500 mt-1">Upload and manage your university documents and records</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Files</p>
            <h3 className="text-xl font-bold text-slate-900">{documents.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified</p>
            <h3 className="text-xl font-bold text-slate-900">
              {documents.filter(d => d.status === 'verified').length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            <h3 className="text-xl font-bold text-slate-900">
              {documents.filter(d => d.status === 'pending').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-md">
        <button 
          onClick={() => setActiveTab('all')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          All Files
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Pending
        </button>
        <button 
          onClick={() => setActiveTab('verified')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'verified' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Verified
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search documents..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Size</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{doc.name}</span>
                        {doc.note && <span className="text-xs text-red-500 font-medium">{doc.note}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-medium">{doc.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{doc.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{doc.size}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                      doc.status === 'verified' ? "bg-emerald-50 text-emerald-600" : 
                      doc.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Download className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No documents found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Document Security & Privacy</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            All uploaded documents are encrypted and stored securely. Only authorized university personnel can view your documents for verification purposes. 
            Make sure all scans are clear and legible to avoid rejection.
          </p>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload New Document"
        footer={
          <>
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={loading || !uploadData.name}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Start Upload
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</label>
            <input 
              type="text"
              value={uploadData.name}
              onChange={(e) => setUploadData({...uploadData, name: e.target.value})}
              placeholder="e.g. Passport Copy"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Type</label>
            <select 
              value={uploadData.type}
              onChange={(e) => setUploadData({...uploadData, type: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="Academic">Academic Record</option>
              <option value="Identity">Identification</option>
              <option value="Health">Health Record</option>
              <option value="Personal">Personal Document</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">File Selection</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
              <FileUp className="w-10 h-10" />
              <div className="text-center">
                <p className="font-bold text-slate-600">Click to select or drag & drop</p>
                <p className="text-xs">PDF, JPG, PNG (Max 10MB)</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Document Preview"
        footer={
          <>
            <button 
              onClick={() => setIsViewModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Close
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95">
              <Download className="w-4 h-4" />
              Download
            </button>
          </>
        }
      >
        {selectedDoc && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{selectedDoc.name}</h4>
                  <p className="text-xs text-slate-500">{selectedDoc.size} • {selectedDoc.type}</p>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                selectedDoc.status === 'verified' ? "bg-emerald-50 text-emerald-600" :
                selectedDoc.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
              )}>
                {selectedDoc.status}
              </span>
            </div>

            <div className="aspect-[3/4] bg-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-400 border border-slate-200">
              <Eye className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Document Preview Simulation</p>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-blue-400/50"></div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document History</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">Uploaded on {selectedDoc.date}</span>
                </div>
                {selectedDoc.status === 'verified' && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-600">Verified by Registrar on {selectedDoc.date}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
