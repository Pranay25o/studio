
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { db } from './firebaseConfig';
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
  writeBatch,
  getDoc,
  QueryConstraint,
  Timestamp, 
  runTransaction
} from "firebase/firestore";

// ##########################################################################
// #                                                                        #
// #       🚨 IMPORTANT: FIREBASE CONFIGURATION REQUIRED 🚨                 #
// #                                                                        #
// #  This app uses Firebase Firestore for data.                            #
// #  Ensure `src/lib/firebaseConfig.ts` has your ACTUAL Firebase project   #
// #  credentials. Failure to do so will prevent Firestore features from    #
// #  working.                                                              #
// #                                                                        #
// #  Placeholder values (like "YOUR_API_KEY_HERE") MUST be replaced.       #
// #  Check the comments in `src/lib/firebaseConfig.ts` for instructions.   #
// #                                                                        #
// ##########################################################################


// --- Collection References ---
const usersCollectionRef = collection(db, "users");
const marksCollectionRef = collection(db, "marks");
const systemSubjectsCollectionRef = collection(db, "systemSubjects");
const semestersCollectionRef = collection(db, "semesters");


// --- System Subject Management Functions (Firestore-backed) ---
// Recommendation: Create a composite index in Firestore on `systemSubjects` collection for `nameLower` (ascending) for efficient queries.
export const getAllAvailableSubjects = async (): Promise<string[]> => {
  try {
    const currentConfigApiKey = (typeof window !== "undefined" && (window as any).firebase?.app?.options?.apiKey) || db.app.options.apiKey;
    if (currentConfigApiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("Firestore connection not attempted for system subjects: Firebase config seems to be using placeholder values.");
        // Fallback to a minimal list if Firebase isn't configured, to prevent UI errors
        return ["Mathematics (Mock)", "Physics (Mock)"];
    }
    const q = query(systemSubjectsCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    const subjects = querySnapshot.docs.map(doc => doc.data().name as string);
    if (subjects.length === 0) {
        console.warn("No system subjects found in Firestore. Add some via the Admin Panel -> Manage System Subjects.");
        return ["Default Subject (None in DB)"]; // Provide a default if none are found to avoid empty dropdowns crashing UI
    }
    return subjects;
  } catch (error: any) {
    console.error("Error fetching system subjects from Firestore:", error);
     if (error.message === "FirebaseMisconfigured") {
        throw error; // Re-throw to be caught by calling component's status handler
    }
    // Fallback in case of other errors
    return ["Mathematics (Error)", "Physics (Error)"];
  }
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;
  try {
    // Recommendation: Index `nameLower` in `systemSubjects`
    const qCheck = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`System subject "${trimmedName}" already exists in Firestore.`);
      return false;
    }
    await addDoc(systemSubjectsCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
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
    const batch = writeBatch(db);

    // Recommendation: Index `nameLower` in `systemSubjects`
    const newNameCheckQuery = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty && newNameCheckSnapshot.docs.some(d => d.data().nameLower !== trimmedOldName.toLowerCase())) {
      console.warn(`New subject name "${trimmedNewName}" already exists in Firestore and is not the item being renamed.`);
      return false;
    }

    // Recommendation: Index `nameLower` in `systemSubjects`
    const oldSubjectQuery = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSubjectSnapshot = await getDocs(oldSubjectQuery);
    if (oldSubjectSnapshot.empty) {
      console.warn(`System subject "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }
    const oldSubjectDoc = oldSubjectSnapshot.docs[0];
    batch.update(doc(db, "systemSubjects", oldSubjectDoc.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });

    // Update in users' general subjects and semester assignments
    // This can be a heavy operation. For production, consider Cloud Functions for such cascading updates.
    // Recommendation: Index `subjects` (array-contains) and `semesterAssignments.subjects` (array-contains) in `users`
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      let userModified = false;
      const updatedUserFields: any = {};

      if (userData.subjects && userData.subjects.includes(trimmedOldName)) {
        updatedUserFields.subjects = userData.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort();
        userModified = true;
      }
      if (userData.semesterAssignments) {
        const newSemesterAssignments = userData.semesterAssignments.map(sa => {
          if (sa.subjects.includes(trimmedOldName)) {
            return { ...sa, subjects: sa.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort() };
          }
          return sa;
        });
        // Basic check for actual change to avoid unnecessary writes
        if (JSON.stringify(newSemesterAssignments) !== JSON.stringify(userData.semesterAssignments)) {
          updatedUserFields.semesterAssignments = newSemesterAssignments;
          userModified = true;
        }
      }
      if (userModified) {
        batch.update(doc(db, "users", userDoc.id), updatedUserFields);
      }
    });

    // Update marks
    // Recommendation: Index `subject` in `marks`
    const marksQuery = query(marksCollectionRef, where("subject", "==", trimmedOldName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.update(doc(db, "marks", markDoc.id), { subject: trimmedNewName });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error renaming system subject in Firestore and related data:", error);
    return false;
  }
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;
  try {
    const batch = writeBatch(db);
    // Recommendation: Index `nameLower` in `systemSubjects`
    const q = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.warn(`System subject "${trimmedName}" not found for deletion in Firestore.`);
      return false;
    }
    const subjectDoc = querySnapshot.docs[0];
    batch.delete(doc(db, "systemSubjects", subjectDoc.id));

    // Update users' general subjects and semester assignments
    // This can be a heavy operation. For production, consider Cloud Functions.
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      let userModified = false;
      const updatedUserFields: any = {};

      if (userData.subjects && userData.subjects.includes(trimmedName)) {
        updatedUserFields.subjects = userData.subjects.filter(s => s !== trimmedName).sort();
        userModified = true;
      }
      if (userData.semesterAssignments) {
        const newSemesterAssignments = userData.semesterAssignments.map(sa => {
          if (sa.subjects.includes(trimmedName)) {
            return { ...sa, subjects: sa.subjects.filter(s => s !== trimmedName).sort() };
          }
          return sa;
        }).filter(sa => sa.subjects.length > 0); // Remove assignment if no subjects left
         if (JSON.stringify(newSemesterAssignments) !== JSON.stringify(userData.semesterAssignments)) {
          updatedUserFields.semesterAssignments = newSemesterAssignments;
          userModified = true;
        }
      }
      if (userModified) {
        batch.update(doc(db, "users", userDoc.id), updatedUserFields);
      }
    });

    // For marks, update subject to indicate it was deleted (or simply delete marks - depends on requirements)
    // Recommendation: Index `subject` in `marks`
    const marksQuery = query(marksCollectionRef, where("subject", "==", trimmedName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      // Option 1: Update subject name
      batch.update(doc(db, "marks", markDoc.id), { subject: `Deleted Subject (${trimmedName})` });
      // Option 2: Delete marks (use if marks for deleted subjects are not needed)
      // batch.delete(doc(db, "marks", markDoc.id));
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting system subject from Firestore and related data:", error);
    return false;
  }
};


// --- Semester Management Functions (Using Firestore) ---
// Recommendation: Create an index in Firestore on `semesters` collection for `name` (ascending) for efficient `orderBy`.
export const getSemesters = async (): Promise<Semester[]> => {
  try {
     const currentConfigApiKey = (typeof window !== "undefined" && (window as any).firebase?.app?.options?.apiKey) || db.app.options.apiKey;
    if (currentConfigApiKey === "YOUR_API_KEY_HERE" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("Firestore connection not attempted for semesters: Firebase config seems to be using placeholder values.");
        throw new Error("FirebaseMisconfigured");
    }
    const q = query(semestersCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    const semesters = querySnapshot.docs.map(doc => doc.data().name as string);
    if (semesters.length === 0) {
        console.warn("No semesters found in Firestore. Add some via the Admin Panel -> Manage Semesters.");
    }
    return semesters;
  } catch (error: any) {
    console.error("Error fetching semesters from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") {
        throw error; // Re-throw for component to handle
    }
    return []; // Return empty on other errors to prevent UI crashes, though component should show error
  }
};

export const addSemester = async (semesterName: string): Promise<boolean> => {
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;
  try {
    // Recommendation: Index `nameLower` in `semesters`
    const qCheck = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      console.warn(`Semester "${trimmedName}" already exists in Firestore.`);
      return false;
    }
    await addDoc(semestersCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase() });
    return true;
  } catch (error) {
    console.error("Error adding semester to Firestore:", error);
    return false;
  }
};

export const renameSemester = async (oldName: string, newName: string): Promise<boolean> => {
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();
  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) return false;

  try {
    const batch = writeBatch(db);

    // Recommendation: Index `nameLower` in `semesters`
    const newNameCheckQuery = query(semestersCollectionRef, where("nameLower", "==", trimmedNewName.toLowerCase()));
    const newNameCheckSnapshot = await getDocs(newNameCheckQuery);
    if (!newNameCheckSnapshot.empty && newNameCheckSnapshot.docs.some(d => d.data().nameLower !== trimmedOldName.toLowerCase())) {
        console.warn(`New semester name "${trimmedNewName}" already exists in Firestore and is not the item being renamed.`);
        return false;
    }

    // Recommendation: Index `nameLower` in `semesters`
    const qOld = query(semestersCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSnapshot = await getDocs(qOld);
    if (oldSnapshot.empty) {
      console.warn(`Semester "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }
    const oldSemesterDoc = oldSnapshot.docs[0];
    batch.update(doc(db, "semesters", oldSemesterDoc.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase() });

    // Update users' semesterAssignments and marks' semester field
    // This can be a heavy operation. For production, consider Cloud Functions.
    // Recommendation: Index `semesterAssignments.semester` in `users` (requires exploring Firestore array indexing)
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      if (userData.semesterAssignments) {
        let modified = false;
        const updatedAssignments = userData.semesterAssignments.map(sa => {
          if (sa.semester.toLowerCase() === trimmedOldName.toLowerCase()) {
            modified = true;
            return { ...sa, semester: trimmedNewName };
          }
          return sa;
        });
        if (modified) {
          batch.update(doc(db, "users", userDoc.id), { semesterAssignments: updatedAssignments.sort((a,b) => a.semester.localeCompare(b.semester)) });
        }
      }
    });

    // Recommendation: Index `semester` in `marks`
    const marksQuery = query(marksCollectionRef, where("semester", "==", trimmedOldName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.update(doc(db, "marks", markDoc.id), { semester: trimmedNewName });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error renaming semester in Firestore and related data:", error);
    return false;
  }
};

export const deleteSemester = async (semesterName: string): Promise<boolean> => {
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;
  try {
    const batch = writeBatch(db);
    // Recommendation: Index `nameLower` in `semesters`
    const q = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.warn(`Semester "${trimmedName}" not found for deletion in Firestore.`);
      return false;
    }
    const semesterDoc = querySnapshot.docs[0];
    batch.delete(doc(db, "semesters", semesterDoc.id));

    // Update users' semesterAssignments and delete marks for this semester
    // This can be a heavy operation. For production, consider Cloud Functions.
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      if (userData.semesterAssignments) {
        const updatedAssignments = userData.semesterAssignments.filter(sa => sa.semester.toLowerCase() !== trimmedName.toLowerCase());
        if (updatedAssignments.length !== userData.semesterAssignments.length) {
          batch.update(doc(db, "users", userDoc.id), { semesterAssignments: updatedAssignments });
        }
      }
    });

    // Recommendation: Index `semester` in `marks`
    const marksQuery = query(marksCollectionRef, where("semester", "==", trimmedName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.delete(doc(db, "marks", markDoc.id));
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting semester from Firestore and related data:", error);
    return false;
  }
};

// --- User Management Functions (Firestore-backed) ---
// Recommendation: Create an index in Firestore on `users` collection for `email` (ascending).
export const getUserByEmail = async (emailInput: string): Promise<User | undefined> => {
  const trimmedEmail = emailInput.trim().toLowerCase();
  try {
    const q = query(usersCollectionRef, where("email", "==", trimmedEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as Omit<User, 'id'>;
      return { id: userDoc.id, ...userData };
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching user by email from Firestore:", error);
    return undefined;
  }
};

export const createUser = async (userData: Omit<User, 'id' | 'subjects' | 'semesterAssignments'> & { subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  try {
    // Recommendation: Create a composite index in Firestore on `users` for `prn` (ascending) AND `role` (ascending) if PRN check is critical.
    // Recommendation: Create an index in Firestore on `users` for `email` (ascending).
    const dataForFirestore: { [key: string]: any } = {
      email: userData.email.trim().toLowerCase(),
      name: userData.name.trim(),
      role: userData.role,
      subjects: userData.subjects || [], // Initialize as empty array if not provided
      semesterAssignments: userData.semesterAssignments || [], // Initialize as empty array
    };

    // Check for existing email
    const existingEmailCheck = await getUserByEmail(dataForFirestore.email);
    if (existingEmailCheck) {
        throw new Error(`User with email ${dataForFirestore.email} already exists.`);
    }

    if (userData.role === 'student') {
      if (!userData.prn || userData.prn.trim() === '') {
        throw new Error("PRN is required for student registration.");
      }
      const prnValue = userData.prn.trim().toUpperCase();

      // Check for existing PRN for students
      const prnCheckQuery = query(usersCollectionRef, where("prn", "==", prnValue), where("role", "==", "student"));
      const prnCheckSnapshot = await getDocs(prnCheckQuery);
      if (!prnCheckSnapshot.empty) {
          throw new Error(`Student with PRN ${prnValue} already exists.`);
      }
      dataForFirestore.prn = prnValue;
    }

    const docRef = await addDoc(usersCollectionRef, dataForFirestore);
    const createdUser: User = {
        id: docRef.id,
        email: dataForFirestore.email,
        name: dataForFirestore.name,
        role: dataForFirestore.role,
        subjects: dataForFirestore.subjects,
        semesterAssignments: dataForFirestore.semesterAssignments,
        ...(dataForFirestore.prn && { prn: dataForFirestore.prn }),
    };
    return createdUser;
  } catch (error) {
    console.error("Error creating user in Firestore:", error);
    throw error; // Re-throw to be handled by AuthContext
  }
};

// Recommendation: Consider pagination for large user bases.
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(usersCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching all users from Firestore:", error);
    return [];
  }
};

// Recommendation: Create a composite index in Firestore on `users` for `role` (ascending).
export const getAllTeachers = async (): Promise<User[]> => {
  try {
    const q = query(usersCollectionRef, where("role", "in", ["teacher", "admin"]));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching teachers from Firestore:", error);
    return [];
  }
};

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists() || (userDocSnap.data().role !== 'teacher' && userDocSnap.data().role !== 'admin')) {
      console.warn(`User ${userId} not found or not a teacher/admin.`);
      return undefined;
    }
    await updateDoc(userDocRef, { subjects: [...new Set(subjects)].sort() }); // Ensure unique and sorted
    const updatedUserDoc = await getDoc(userDocRef); // Re-fetch to get the latest data
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;
  } catch (error) {
    console.error("Error assigning subjects to teacher in Firestore:", error);
    return undefined;
  }
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjectsToAssign: string[]): Promise<User | undefined> => {
  try {
    const userDocRef = doc(db, "users", userId);

    await runTransaction(db, async (transaction) => {
      const userDocSnap = await transaction.get(userDocRef);
      if (!userDocSnap.exists() || (userDocSnap.data().role !== 'teacher' && userDocSnap.data().role !== 'admin')) {
        throw new Error(`User ${userId} not found or not a teacher/admin.`);
      }

      const userData = userDocSnap.data() as User;
      let semesterAssignments = userData.semesterAssignments ? [...userData.semesterAssignments] : [];
      
      const existingAssignmentIndex = semesterAssignments.findIndex(sa => sa.semester === semester);
      const sortedSubjects = [...new Set(subjectsToAssign)].sort(); // Ensure unique and sorted

      if (existingAssignmentIndex !== -1) {
        // Update existing assignment
        if (sortedSubjects.length === 0) {
          // If no subjects are provided, remove the assignment for this semester
          semesterAssignments.splice(existingAssignmentIndex, 1);
        } else {
          semesterAssignments[existingAssignmentIndex].subjects = sortedSubjects;
        }
      } else if (sortedSubjects.length > 0) {
        // Add new assignment only if there are subjects to assign
        semesterAssignments.push({ semester, subjects: sortedSubjects });
      }
      
      semesterAssignments.sort((a,b) => a.semester.localeCompare(b.semester)); // Keep sorted
      transaction.update(userDocRef, { semesterAssignments });
    });

    const updatedUserDoc = await getDoc(userDocRef); // Re-fetch the user document
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

  } catch (error) {
    console.error("Error assigning subjects to teacher for semester in Firestore:", error);
    return undefined; // Or throw error to be handled by UI
  }
};


// --- Student and Mark Management Functions (Firestore-backed) ---
// Recommendation: Create an index in Firestore on `users` for `role` (ascending).
// This function is lightweight as it only fetches student profiles (users with role 'student').
export const getAllStudents = async (): Promise<Omit<Student, 'marks'>[]> => {
  try {
    const studentUsersQuery = query(usersCollectionRef, where("role", "==", "student"));
    const studentUsersSnapshot = await getDocs(studentUsersQuery);

    const students: Omit<Student, 'marks'>[] = studentUsersSnapshot.docs.map(userDoc => {
      const userData = userDoc.data() as User;
      if (!userData.prn) {
        console.warn(`Student user ${userData.name} (ID: ${userDoc.id}) is missing PRN. Skipping.`);
        return null; // Or handle differently
      }
      return {
        id: userData.prn!, // Student ID is PRN
        name: userData.name,
        email: userData.email,
      };
    }).filter(student => student !== null) as Omit<Student, 'marks'>[]; // Filter out nulls
    
    return students.sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching all student profiles from Firestore:", error);
    return [];
  }
};

// Fetches all marks, optionally filtered by semester
// Recommendation: Create a composite index in Firestore on `marks` for `semester` (asc) AND other fields if frequently sorted (e.g., `studentId` asc).
export const getAllMarks = async (semester?: Semester): Promise<Mark[]> => {
    try {
        const constraints: QueryConstraint[] = [];
        if (semester) {
            constraints.push(where("semester", "==", semester));
        }
        // Example: constraints.push(orderBy("studentId"), orderBy("subject"));
        
        const q = query(marksCollectionRef, ...constraints);
        const marksSnapshot = await getDocs(q);
        return marksSnapshot.docs.map(markDoc => ({
            id: markDoc.id,
            ...markDoc.data()
        } as Mark));
    } catch (error) {
        console.error("Error fetching all marks from Firestore:", error);
        return [];
    }
};

// Recommendation: Create an index in Firestore on `users` for `prn` (ascending) AND `role` (ascending).
// Recommendation: Create an index in Firestore on `marks` for `studentId` (ascending).
export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  try {
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);

    if (studentUserSnapshot.empty) {
      console.warn(`Student user with PRN ${prn} not found.`);
      return undefined;
    }
    const userDoc = studentUserSnapshot.docs[0];
    const userData = userDoc.data() as User;

    // Fetch marks for this specific student
    const marksQuery = query(marksCollectionRef, where("studentId", "==", prn));
    const marksSnapshot = await getDocs(marksQuery);
    const studentMarks: Mark[] = marksSnapshot.docs.map(markDoc => ({
      id: markDoc.id,
      ...markDoc.data()
    } as Mark));

    return {
      id: userData.prn!,
      name: userData.name,
      email: userData.email,
      marks: studentMarks,
    };
  } catch (error) {
    console.error(`Error fetching student by PRN ${prn} from Firestore:`, error);
    return undefined;
  }
};

// Recommendation: Create a composite index in Firestore on `marks` for `studentId`, `subject`, `semester`, `assessmentType` to efficiently check for duplicates.
export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  try {
    // Validate student exists
    const studentQuery = query(usersCollectionRef, where("prn", "==", markData.studentId), where("role", "==", "student"));
    const studentSnapshot = await getDocs(studentQuery);
    if (studentSnapshot.empty) {
        throw new Error(`Student with PRN ${markData.studentId} not found. Cannot add mark.`);
    }

    // Prevent duplicate mark for the same student, subject, semester, and assessmentType
    const markCheckQuery = query(marksCollectionRef,
        where("studentId", "==", markData.studentId),
        where("subject", "==", markData.subject),
        where("semester", "==", markData.semester),
        where("assessmentType", "==", markData.assessmentType)
    );
    const markCheckSnapshot = await getDocs(markCheckQuery);
    if (!markCheckSnapshot.empty) {
        // Instead of throwing error, update the existing mark if found
        console.warn(`Mark for ${markData.assessmentType} in ${markData.subject} (${markData.semester}) for student ${markData.studentId} already exists. Updating instead.`);
        const existingMarkDoc = markCheckSnapshot.docs[0];
        await updateDoc(doc(db, "marks", existingMarkDoc.id), markData);
        return { id: existingMarkDoc.id, ...markData };
    }

    const docRef = await addDoc(marksCollectionRef, markData);
    return { id: docRef.id, ...markData };
  } catch (error) {
    console.error("Error adding or updating mark in Firestore:", error);
    throw error;
  }
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  try {
    const markDocRef = doc(db, "marks", updatedMark.id);
    const { id, ...markDataToUpdate } = updatedMark; // Exclude 'id' from the data being written
    await updateDoc(markDocRef, markDataToUpdate);
    return updatedMark;
  } catch (error) {
    console.error("Error updating mark in Firestore:", error);
    return undefined;
  }
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  try {
    const markDocRef = doc(db, "marks", markId);
    await deleteDoc(markDocRef);
    return true;
  } catch (error) {
    console.error("Error deleting mark from Firestore:", error);
    return false;
  }
};

// Recommendation: Create an index in Firestore on `users` for `prn` (ascending) AND `role` (ascending).
export const updateStudentName = async (prn: string, newName: string): Promise<Omit<Student, 'marks'> | undefined> => {
  try {
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);

    if (studentUserSnapshot.empty) {
      console.warn(`Student user with PRN ${prn} not found for name update.`);
      return undefined;
    }
    const userDocToUpdate = studentUserSnapshot.docs[0];
    const userDocRef = doc(db, "users", userDocToUpdate.id);
    await updateDoc(userDocRef, { name: newName });

    const updatedUserSnap = await getDoc(userDocRef);
    if (!updatedUserSnap.exists()) { // Should not happen if updateDoc succeeded
        console.warn(`Updated student user with PRN ${prn} not found after update.`);
        return undefined;
    }
    const updatedUserData = updatedUserSnap.data() as User;
    return {
      id: updatedUserData.prn!,
      name: updatedUserData.name,
      email: updatedUserData.email,
      // Marks are not returned here to keep the function focused on name update
    };

  } catch (error) {
    console.error(`Error updating student name for PRN ${prn} in Firestore:`, error);
    return undefined;
  }
};
