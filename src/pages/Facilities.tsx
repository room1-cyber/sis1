import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Monitor, 
  AirVent, 
  Users, 
  Clock,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  DoorOpen,
  Settings,
  Calendar,
  Info,
  Edit2,
  Trash2,
  Wifi,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

export default function Facilities() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [newBuilding, setNewBuilding] = useState({ name: '', code: '', floors: 0 });
  const [newRoom, setNewRoom] = useState({ 
    code: '', 
    type: 'Lecture Hall', 
    capacity: 0, 
    floor: '',
    department: profile?.department || ''
  });

  useEffect(() => {
    const q = query(collection(db, 'buildings'));
    const unsub = onSnapshot(q, (snap) => {
      const bldList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBuildings(bldList);
      if (bldList.length > 0 && !activeBuilding) {
        setActiveBuilding(bldList[0].id);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeBuilding) return;
    const q = (profile?.role === 'dept_admin' && profile.department)
      ? query(collection(db, 'rooms'), where('buildingId', '==', activeBuilding), where('department', '==', profile.department))
      : query(collection(db, 'rooms'), where('buildingId', '==', activeBuilding));
      
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [activeBuilding, profile]);

  useEffect(() => {
    if (!selectedRoom || !isScheduleModalOpen) return;
    
    // Fetch offerings assigned to this room
    const q = query(collection(db, 'offerings'), where('roomId', '==', selectedRoom.id));
    const unsub = onSnapshot(q, (snap) => {
      const roomSchedule = snap.docs.map(doc => {
        const data = doc.data();
        return {
          time: `${data.startTime} - ${data.endTime}`,
          course: `${data.courseCode}: ${data.courseName}`,
          instructor: data.instructorName || 'TBA'
        };
      });
      setSchedule(roomSchedule);
    });
    return () => unsub();
  }, [selectedRoom, isScheduleModalOpen]);

  const currentBuilding = buildings.find(b => b.id === activeBuilding);

  const handleAddBuilding = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'buildings'), {
        ...newBuilding,
        roomsCount: 0,
        status: 'operational',
        createdAt: serverTimestamp()
      });
      setIsBuildingModalOpen(false);
      setNewBuilding({ name: '', code: '', floors: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'buildings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!activeBuilding) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'rooms'), {
        ...newRoom,
        buildingId: activeBuilding,
        equipment: [],
        status: 'available',
        createdAt: serverTimestamp()
      });
      setIsRoomModalOpen(false);
      setNewRoom({ 
        code: '', 
        type: 'Lecture Hall', 
        capacity: 0, 
        floor: '', 
        department: profile?.department || '' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('facilities')}</h1>
          <p className="text-slate-500 mt-1">Campus buildings, rooms, and resource management</p>
        </div>
        <button 
          onClick={() => setIsBuildingModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          <span>Add Building</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Buildings Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Buildings</h3>
          <div className="space-y-1">
            {buildings.map((building) => (
              <button
                key={building.id}
                onClick={() => setActiveBuilding(building.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group",
                  activeBuilding === building.id 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-100 font-bold" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Building2 className={cn("w-5 h-5", activeBuilding === building.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <div className="flex-1 truncate">
                  <p className="truncate">{building.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{building.code}</p>
                </div>
                {activeBuilding === building.id && (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms View */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{currentBuilding?.name}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> {currentBuilding?.floors} Floors</span>
                  <span className="flex items-center gap-1.5"><DoorOpen className="w-4 h-4" /> {currentBuilding?.rooms} Rooms</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsRoomModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Add Room</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <motion.div 
                key={room.id}
                whileHover={{ y: -4 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Room {room.code}</h3>
                      <p className="text-sm text-slate-500">{room.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsScheduleModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                      room.status === 'available' ? "bg-emerald-50 text-emerald-600" : 
                      room.status === 'occupied' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {room.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Cap: {room.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Next: 14:00</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {room.equipment.map((eq, i) => (
                    <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                      {eq === 'Projector' && <Monitor className="w-3 h-3" />}
                      {eq === 'AC' && <AirVent className="w-3 h-3" />}
                      {eq}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <button className="text-blue-600 text-sm font-bold hover:underline">View Schedule</button>
                  <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Building Modal */}
      <Modal
        isOpen={isBuildingModalOpen}
        onClose={() => setIsBuildingModalOpen(false)}
        title="Add New Building"
        footer={
          <>
            <button 
              onClick={() => setIsBuildingModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddBuilding}
              disabled={loading || !newBuilding.name || !newBuilding.code}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Create Building
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Building Name</label>
            <input 
              type="text"
              value={newBuilding.name}
              onChange={(e) => setNewBuilding({...newBuilding, name: e.target.value})}
              placeholder="e.g. Faculty of Engineering"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Building Code</label>
              <input 
                type="text"
                value={newBuilding.code}
                onChange={(e) => setNewBuilding({...newBuilding, code: e.target.value})}
                placeholder="e.g. ENG-01"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Floors</label>
              <input 
                type="number"
                value={newBuilding.floors || ''}
                onChange={(e) => setNewBuilding({...newBuilding, floors: Number(e.target.value)})}
                placeholder="e.g. 4"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title="Add New Room"
        footer={
          <>
            <button 
              onClick={() => setIsRoomModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddRoom}
              disabled={loading || !newRoom.code}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Create Room
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Number/Code</label>
              <input 
                type="text"
                value={newRoom.code}
                onChange={(e) => setNewRoom({...newRoom, code: e.target.value})}
                placeholder="e.g. 101"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Type</label>
              <select 
                value={newRoom.type}
                onChange={(e) => setNewRoom({...newRoom, type: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option>Lecture Hall</option>
                <option>Computer Lab</option>
                <option>Seminar Room</option>
                <option>Office</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity</label>
              <input 
                type="number"
                value={newRoom.capacity || ''}
                onChange={(e) => setNewRoom({...newRoom, capacity: Number(e.target.value)})}
                placeholder="e.g. 40"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Floor</label>
              <input 
                type="text"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                placeholder="e.g. 1st Floor"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
            <input 
              type="text"
              value={newRoom.department}
              onChange={(e) => setNewRoom({...newRoom, department: e.target.value})}
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipment</label>
            <div className="grid grid-cols-2 gap-2">
              {['Projector', 'Smart Board', 'AC', 'Internet', 'PCs', 'Sound System'].map(item => (
                <label key={item} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Room Schedule Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={selectedRoom ? `Room ${selectedRoom.code} Schedule` : 'Room Schedule'}
        footer={
          <button 
            onClick={() => setIsScheduleModalOpen(false)}
            className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
          >
            Close
          </button>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-900">Today's Schedule</span>
            </div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">April 4, 2026</span>
          </div>

          <div className="space-y-4">
            {schedule.length > 0 ? (
              schedule.map((slot, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-200 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-600">{slot.time}</span>
                      </div>
                      <p className="font-bold text-slate-900">{slot.course}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {slot.instructor}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No classes scheduled for today</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Room scheduling is managed by the Registrar's office. For special bookings, please submit a request through the administrative portal.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
