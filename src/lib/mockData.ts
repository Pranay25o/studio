
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { db } from './firebaseConfig'; // Import Firestore instance
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  writeBatch
} from "firebase/firestore";

export let mockSemesters: Semester[] = [
  "Fall 2023",
  "Spring 2024",
  "Summer 2024",
  "Fall 2024",
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
].sort();

export let mockUsers: User[] = [
  { 
    id: 'teacher1', 
    email: 'teacher@example.com', 
    name: 'Prof. Ada Lovelace', 
    role: 'teacher', 
    subjects: ['Mathematics', 'Physics'], // General oversight subjects
    semesterAssignments: [
      { semester: "Fall 2023", subjects: ['Mathematics', 'Physics'] },
      { semester: "Spring 2024", subjects: ['Mathematics'] }
    ]
  },
  { 
    id: 'teacher2', 
    email: 'prof.curie@example.com', 
    name: 'Prof. Marie Curie', 
    role: 'teacher', 
    subjects: ['Chemistry', 'Advanced Physics'],
    semesterAssignments: [
      { semester: "Fall 2023", subjects: ['Chemistry'] },
      { semester: "Spring 2024", subjects: ['Chemistry', 'Advanced Physics'] }
    ]
  },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
  { id: 'admin01', email: 'admin@example.com', name: 'Super Admin', role: 'admin', subjects: [], semesterAssignments: [] },
];

export let mockMarks: Mark[] = [
  // Alice Smith - PRN001
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA1', score: 8, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark2', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA2', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA2 },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'MidSem', score: 15, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark4', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'EndSem', score: 48, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark5', studentId: 'PRN001', subject: 'Physics', assessmentType: 'CA1', score: 9, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark6', studentId: 'PRN001', subject: 'Physics', assessmentType: 'MidSem', score: 18, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark11', studentId: 'PRN001', subject: 'Physics', assessmentType: 'EndSem', score: 50, maxScore: ASSESSMENT_MAX_SCORES.EndSem },


  // Bob Johnson - PRN002
  { id: 'mark7', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'CA1', score: 6, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark8', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'EndSem', score: 40, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark9', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'CA1', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark10', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'MidSem', score: 12, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
];

export let mockStudents: Student[] = [
  {
    id: 'PRN001',
    name: 'Alice Smith',
    email: 'student1@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN001'),
  },
  {
    id: 'PRN002',
    name: 'Bob Johnson',
    email: 'student2@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN002'),
  },
  {
    id: 'PRN003',
    name: 'Charlie Brown',
    email: 'student3@example.com',
    marks: [],
  },
];

// --- System Subject Management Functions (Now using Firestore) ---
const systemSubjectsCollection = collection(db, "systemSubjects");

export const getAllAvailableSubjects = async (): Promise<string[]> => {
  try {
    const q = query(systemSubjectsCollection, orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().name as string);
  } catch (error) {
    console.error("Error fetching system subjects from Firestore:", error);
    // Check if it's a known placeholder error
    if (error instanceof Error && (error.message.includes("Could not reach Cloud Firestore backend") || error.message.includes("Failed to get document because the client is offline."))) {
        const currentConfig = (typeof window !== "undefined" && (window as any).firebase?.app?.options) || {};
         if (currentConfig.apiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
            console.warn("Firestore connection failed: Firebase config seems to be using placeholder values.");
            throw new Error("FirebaseMisconfigured");
        }
    }
    return []; // Return empty array on other errors
  }
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;

  try {
    // Check if subject already exists (case-insensitive for robustness, though Firestore queries are case-sensitive by default)
    const qCheck = query(systemSubjectsCollection, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`Subject "${trimmedName}" already exists.`);
      return false; // Subject already exists
    }
    
    await addDoc(systemSubjectsCollection, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
    return true;
  } catch (error) {
    console.error("Error adding system subject to Firestore:", error);
    return false;
  }
};

export const renameSystemSubject = async (oldName: string, newName: string): Promise<boolean> => {
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) return false;

  try {
    // Check if new name already exists
    const newNameCheckQuery = query(systemSubjectsCollection, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty) {
        // Check if the found document is actually the one we are trying to rename
        let isSelf = false;
        newNameCheckSnapshot.forEach(doc => {
            if (doc.data().name.toLowerCase() === trimmedOldName.toLowerCase()) {
                isSelf = true;
            }
        });
        if (!isSelf) {
            console.warn(`New subject name "${trimmedNewName}" already exists.`);
            return false;
        }
    }
    
    const q = query(systemSubjectsCollection, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Subject "${trimmedOldName}" not found for renaming.`);
      return false; // Old name doesn't exist
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.update(doc(db, "systemSubjects", docSnapshot.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });
    });
    await batch.commit();

    // Propagate renames to mockUsers and mockMarks (local mock data)
    // In a full Firestore setup, this would involve updating relevant documents in 'users' and 'marks' collections.
    mockUsers.forEach(user => {
      if (user.subjects) {
        user.subjects = user.subjects.map(s => s.toLowerCase() === trimmedOldName.toLowerCase() ? trimmedNewName : s).sort();
      }
      if (user.semesterAssignments) {
        user.semesterAssignments.forEach(assignment => {
          assignment.subjects = assignment.subjects.map(s => s.toLowerCase() === trimmedOldName.toLowerCase() ? trimmedNewName : s).sort();
        });
      }
    });
    mockMarks.forEach(mark => {
      if (mark.subject.toLowerCase() === trimmedOldName.toLowerCase()) {
        mark.subject = trimmedNewName;
      }
    });
    mockStudents.forEach(student => {
      student.marks.forEach(mark => {
        if (mark.subject.toLowerCase() === trimmedOldName.toLowerCase()) {
          mark.subject = trimmedNewName;
        }
      });
    });

    return true;
  } catch (error) {
    console.error("Error renaming system subject in Firestore:", error);
    return false;
  }
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;

  try {
    const q = query(systemSubjectsCollection, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Subject "${trimmedName}" not found for deletion.`);
      return false;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      batch.delete(doc(db, "systemSubjects", docSnapshot.id));
    });
    await batch.commit();
    
    // Propagate deletes to mockUsers and mockMarks (local mock data)
    // In a full Firestore setup, this would involve a more robust strategy.
    const replacementSubjectName = `Archived Subject (${trimmedName})`;
    mockUsers.forEach(user => {
      if (user.subjects) {
        user.subjects = user.subjects.filter(s => s.toLowerCase() !== trimmedName.toLowerCase()).sort();
      }
      if (user.semesterAssignments) {
        user.semesterAssignments.forEach(assignment => {
          assignment.subjects = assignment.subjects.filter(s => s.toLowerCase() !== trimmedName.toLowerCase()).sort();
        });
      }
    });
    mockMarks.forEach(mark => {
      if (mark.subject.toLowerCase() === trimmedName.toLowerCase()) {
        mark.subject = replacementSubjectName; 
      }
    });
    mockStudents.forEach(student => {
      student.marks.forEach(mark => {
        if (mark.subject.toLowerCase() === trimmedName.toLowerCase()) {
          mark.subject = replacementSubjectName;
        }
      });
    });
    return true;
  } catch (error) {
    console.error("Error deleting system subject from Firestore:", error);
    return false;
  }
};


// --- Existing Mock Functions (to be migrated later) ---

export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  const student = mockStudents.find(s => s.id === prn);
  if (student) {
    return { ...student, marks: mockMarks.filter(m => m.studentId === prn) };
  }
  return undefined;
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockStudents.map(s => ({
    ...s,
    marks: mockMarks.filter(m => m.studentId === s.id)
  }));
};

export const getAllTeachers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockUsers.filter(user => user.role === 'teacher');
};

export const getAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockUsers];
};


export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newMark: Mark = { ...markData, id: `mark${mockMarks.length + 1}` };
  mockMarks.push(newMark);
  const studentIndex = mockStudents.findIndex(s => s.id === markData.studentId);
  if (studentIndex !== -1) {
    const studentMarks = mockMarks.filter(m => m.studentId === markData.studentId);
    mockStudents[studentIndex].marks = studentMarks;
  }
  return newMark;
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const markIndex = mockMarks.findIndex(m => m.id === updatedMark.id);
  if (markIndex !== -1) {
    mockMarks[markIndex] = updatedMark;
    const studentIndex = mockStudents.findIndex(s => s.id === updatedMark.studentId);
    if (studentIndex !== -1) {
      const studentMarkIndex = mockStudents[studentIndex].marks.findIndex(m => m.id === updatedMark.id);
      if (studentMarkIndex !== -1) {
        mockStudents[studentIndex].marks[studentMarkIndex] = updatedMark;
      } else { 
         mockStudents[studentIndex].marks.push(updatedMark);
      }
    }
    return updatedMark;
  }
  return undefined;
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const markIndex = mockMarks.findIndex(m => m.id === markId);
  if (markIndex !== -1) {
    const studentId = mockMarks[markIndex].studentId;
    mockMarks.splice(markIndex, 1);
    const studentIndex = mockStudents.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
      mockStudents[studentIndex].marks = mockStudents[studentIndex].marks.filter(m => m.id !== markId);
    }
    return true;
  }
  return false;
};

export const updateStudentName = async (prn: string, newName: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const studentIndex = mockStudents.findIndex(s => s.id === prn);
  if (studentIndex !== -1) {
    mockStudents[studentIndex].name = newName;
    const userIndex = mockUsers.findIndex(u => u.prn === prn);
    if (userIndex !== -1) {
      mockUsers[userIndex].name = newName;
    }
    return mockStudents[studentIndex];
  }
  return undefined;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const trimmedEmail = email.trim().toLowerCase();
  console.log('[getUserByEmail] Received email to search for (trimmed, lowercased):', trimmedEmail);
  await new Promise(resolve => setTimeout(resolve, 50)); 
  
  const foundUser = mockUsers.find(u => u.email.toLowerCase() === trimmedEmail);
  if (foundUser) {
    console.log('[getUserByEmail] Found user (from MOCK):', JSON.stringify(foundUser));
  } else {
    console.log('[getUserByEmail] User NOT found for email (from MOCK - trimmed, case-insensitive):', trimmedEmail);
  }
  return foundUser;
}

export const createUser = async (userData: Omit<User, 'id'> & { subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newUser: User = { 
    ...userData, 
    id: `user${mockUsers.length + 1}`,
    subjects: userData.subjects || [],
    semesterAssignments: userData.semesterAssignments || [] 
  };
  if (userData.role === 'student' && !userData.prn) {
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}`;
  } else if (userData.role === 'student' && userData.prn) {
    newUser.prn = userData.prn.trim().toUpperCase(); // Ensure PRN is uppercase
  }
  
  mockUsers.push(newUser);

  if (newUser.role === 'student' && newUser.prn) {
    const existingStudentIndex = mockStudents.findIndex(s => s.id === newUser.prn);
    if (existingStudentIndex === -1) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      // If student with this PRN already exists in mockStudents, update their name/email if different
      // This could happen if a user registers with an existing PRN
      mockStudents[existingStudentIndex].name = newUser.name; 
      mockStudents[existingStudentIndex].email = newUser.email;
    }
  }
  return newUser;
}

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex !== -1) {
    mockUsers[userIndex].subjects = [...subjects].sort();
    return mockUsers[userIndex];
  }
  return undefined;
};


export const getSemesters = async (): Promise<Semester[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockSemesters];
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex === -1) return undefined;

  const user = mockUsers[userIndex];
  if (!user.semesterAssignments) {
    user.semesterAssignments = [];
  }

  const existingSemesterAssignmentIndex = user.semesterAssignments.findIndex(sa => sa.semester === semester);
  const sortedSubjects = [...subjects].sort();

  if (existingSemesterAssignmentIndex !== -1) {
    if (sortedSubjects.length === 0) { 
      // If no subjects are provided for an existing assignment, remove the assignment
      user.semesterAssignments.splice(existingSemesterAssignmentIndex, 1);
    } else {
      // Update existing assignment
      user.semesterAssignments[existingSemesterAssignmentIndex].subjects = sortedSubjects;
    }
  } else if (sortedSubjects.length > 0) { 
    // Add new assignment only if there are subjects to assign
    user.semesterAssignments.push({ semester, subjects: sortedSubjects });
    user.semesterAssignments.sort((a, b) => a.semester.localeCompare(b.semester)); 
  }
  
  return user;
};
