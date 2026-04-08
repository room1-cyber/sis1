import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export type AcademicStanding = 'Good Standing' | 'Academic Probation' | 'Academic Suspension' | 'Dean\'s List';

export const calculateAcademicStanding = (gpa: number): AcademicStanding => {
  if (gpa >= 3.5) return "Dean's List";
  if (gpa >= 2.0) return "Good Standing";
  if (gpa >= 1.5) return "Academic Probation";
  return "Academic Suspension";
};

export const updateStudentAcademicStanding = async (studentId: string) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    
    let totalPoints = 0;
    let count = 0;
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.grade) {
        // Simple mapping if gpaPoints is not set
        let points = data.gpaPoints;
        if (points === undefined) {
          const gradeMap: { [key: string]: number } = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
          points = gradeMap[data.grade] || 0;
        }
        totalPoints += points;
        count++;
      }
    });
    
    const gpa = count > 0 ? totalPoints / count : 0;
    const standing = calculateAcademicStanding(gpa);
    
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      academicStanding: standing,
      updatedAt: new Date().toISOString()
    });
    
    // Also update the user profile status if suspended
    const userRef = doc(db, 'users', studentId);
    if (standing === 'Academic Suspension') {
      await updateDoc(userRef, { status: 'suspended' });
    } else {
      // If they were suspended but now they are not, we might want to reactivate
      // but that's a business decision. Let's stick to the standing for now.
    }
  } catch (error) {
    console.error("Error updating academic standing:", error);
  }
};
