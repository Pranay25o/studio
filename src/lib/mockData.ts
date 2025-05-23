
// src/lib/mockData.ts
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { db } from './firebaseConfig'; // Ensure this is correctly configured
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
// #       🚨 IMPORTANT: FIREBASE CONFIGURATION & RULES REQUIRED 🚨         #
// #                                                                        #
// #  1. Ensure `src/lib/firebaseConfig.ts` has your ACTUAL Firebase        #
// #     project credentials.                                               #
// #  2. If you see "Missing or insufficient permissions" errors,           #
// #     you MUST check and update your Firestore Security Rules in the     #
// #     Firebase console. For development, you might temporarily set       #
// #     rules to `allow read, write: if true;` or                         #
// #     `allow read, write: if request.auth != null;` but secure these     #
// #     for production.                                                    #
// #                                                                        #
// ##########################################################################

const checkFirebaseConfig = () => {
  // Check if db object exists and has the app property and options
  if (!db || !db.app || !db.app.options || !db.app.options.apiKey) {
    console.error("CRITICAL: Firebase SDK not initialized correctly. db object is invalid.");
    throw new Error("FirebaseMisconfigured");
  }
  const currentConfigApiKey = db.app.options.apiKey;
  if (currentConfigApiKey === "YOUR_API_KEY_HERE" || currentConfigApiKey === "" || currentConfigApiKey === undefined) {
    console.error("CRITICAL: Firebase config in src/lib/firebaseConfig.ts is using placeholder values or is empty. Update it with your project credentials.");
    throw new Error("FirebaseMisconfigured");
  }
};


// --- Collection References ---
const usersCollectionRef = collection(db, "users");
const marksCollectionRef = collection(db, "marks");
const systemSubjectsCollectionRef = collection(db, "systemSubjects");
const semestersCollectionRef = collection(db, "semesters");


// --- System Subject Management Functions (Firestore-backed) ---
export const getAllAvailableSubjects = async (): Promise<string[]> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `name` in `systemSubjects`
    const q = query(systemSubjectsCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    const subjects = querySnapshot.docs.map(doc => doc.data().name as string);
    if (subjects.length === 0) {
        console.warn("No system subjects found in Firestore. Add some via the Admin Panel -> Manage System Subjects.");
    }
    return subjects;
  } catch (error: any) {
    console.error("[getAllAvailableSubjects] Error fetching system subjects from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // If permission error, specific Firestore rules are needed.
    // For other errors, return fallback.
    return ["Error Loading Subjects"];
  }
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  checkFirebaseConfig();
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
    await addDoc(systemSubjectsCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase(), createdAt: Timestamp.now() });
    return true;
  } catch (error: any)
{
    console.error("[addSystemSubject] Error adding system subject to Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

export const renameSystemSubject = async (oldName: string, newName: string): Promise<boolean> => {
  checkFirebaseConfig();
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

    const oldSubjectQuery = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSubjectSnapshot = await getDocs(oldSubjectQuery);

    if (oldSubjectSnapshot.empty) {
      console.warn(`System subject "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }
    const oldSubjectDoc = oldSubjectSnapshot.docs[0];
    batch.update(doc(db, "systemSubjects", oldSubjectDoc.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase(), updatedAt: Timestamp.now() });

    // Update in users' general subjects and semester assignments
    // Recommendation: Composite index on `subjects` (array-contains) for users.
    // Recommendation: For semesterAssignments, if querying deeply, structure might need adjustment or more complex indexing.
    const usersQueryGeneral = query(usersCollectionRef, where("subjects", "array-contains", trimmedOldName));
    const usersSnapshotGeneral = await getDocs(usersQueryGeneral);
    usersSnapshotGeneral.forEach(userDoc => {
      const userData = userDoc.data() as User;
      const updatedSubjects = userData.subjects?.map(s => s === trimmedOldName ? trimmedNewName : s).sort() || [];
      batch.update(doc(db, "users", userDoc.id), { subjects: updatedSubjects });
    });

    // This is more complex to query directly for nested array updates in Firestore efficiently without fetching all users.
    // For a production app with many users, consider Cloud Functions for such cascading updates.
    // For now, fetching all users and updating if needed:
    const allUsersSnapshot = await getDocs(usersCollectionRef);
    allUsersSnapshot.forEach(userDoc => {
        const userData = userDoc.data() as User;
        if (userData.semesterAssignments) {
            let userModified = false;
            const newSemesterAssignments = userData.semesterAssignments.map(sa => {
                if (sa.subjects.includes(trimmedOldName)) {
                    userModified = true;
                    return { ...sa, subjects: sa.subjects.map(s => s === trimmedOldName ? trimmedNewName : s).sort() };
                }
                return sa;
            });
            if (userModified) {
                batch.update(doc(db, "users", userDoc.id), { semesterAssignments: newSemesterAssignments });
            }
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
  } catch (error: any) {
    console.error("[renameSystemSubject] Error renaming system subject in Firestore and related data:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  checkFirebaseConfig();
  const trimmedName = subjectName.trim();
  if (!trimmedName) return false;
  try {
    const batch = writeBatch(db);
    const q = query(systemSubjectsCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.warn(`System subject "${trimmedName}" not found for deletion in Firestore.`);
      return false;
    }
    const subjectDoc = querySnapshot.docs[0];
    batch.delete(doc(db, "systemSubjects", subjectDoc.id));

    // Update in users' general subjects and semester assignments
    const usersQueryGeneral = query(usersCollectionRef, where("subjects", "array-contains", trimmedName));
    const usersSnapshotGeneral = await getDocs(usersQueryGeneral);
    usersSnapshotGeneral.forEach(userDoc => {
      const userData = userDoc.data() as User;
      const updatedSubjects = userData.subjects?.filter(s => s !== trimmedName).sort() || [];
      batch.update(doc(db, "users", userDoc.id), { subjects: updatedSubjects });
    });

    const allUsersSnapshot = await getDocs(usersCollectionRef);
    allUsersSnapshot.forEach(userDoc => {
        const userData = userDoc.data() as User;
        if (userData.semesterAssignments) {
            let userModified = false;
            const newSemesterAssignments = userData.semesterAssignments.map(sa => {
                if (sa.subjects.includes(trimmedName)) {
                    userModified = true;
                    return { ...sa, subjects: sa.subjects.filter(s => s !== trimmedName).sort() };
                }
                return sa;
            }).filter(sa => sa.subjects.length > 0); // Remove assignments with no subjects
            if (userModified) {
                 batch.update(doc(db, "users", userDoc.id), { semesterAssignments: newSemesterAssignments });
            }
        }
    });

    // Update marks: mark subject as "Deleted Subject (Original Name)"
    const marksQuery = query(marksCollectionRef, where("subject", "==", trimmedName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.update(doc(db, "marks", markDoc.id), { subject: `Deleted Subject (${trimmedName})` });
    });

    await batch.commit();
    return true;
  } catch (error: any) {
    console.error("[deleteSystemSubject] Error deleting system subject from Firestore and related data:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};


// --- Semester Management Functions (Using Firestore) ---
export const getSemesters = async (): Promise<Semester[]> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `name` in `semesters`
    const q = query(semestersCollectionRef, orderBy("name"));
    const querySnapshot = await getDocs(q);
    const semesters = querySnapshot.docs.map(doc => doc.data().name as string);
    if (semesters.length === 0) {
        console.warn("No semesters found in Firestore. Add some via the Admin Panel -> Manage Semesters.");
    }
    return semesters;
  } catch (error: any) {
    console.error("[getSemesters] Error fetching semesters from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return [];
  }
};

export const addSemester = async (semesterName: string): Promise<boolean> => {
  checkFirebaseConfig();
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
    await addDoc(semestersCollectionRef, { name: trimmedName, nameLower: trimmedName.toLowerCase(), createdAt: Timestamp.now() });
    return true;
  } catch (error: any) {
    console.error("[addSemester] Error adding semester to Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

export const renameSemester = async (oldName: string, newName: string): Promise<boolean> => {
  checkFirebaseConfig();
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

    const qOld = query(semestersCollectionRef, where("nameLower", "==", trimmedOldName.toLowerCase()));
    const oldSnapshot = await getDocs(qOld);
    if (oldSnapshot.empty) {
      console.warn(`Semester "${trimmedOldName}" not found for renaming in Firestore.`);
      return false;
    }
    const oldSemesterDoc = oldSnapshot.docs[0];
    batch.update(doc(db, "semesters", oldSemesterDoc.id), { name: trimmedNewName, nameLower: trimmedNewName.toLowerCase(), updatedAt: Timestamp.now() });

    // Recommendation: For semesterAssignments, if querying deeply, structure might need adjustment or more complex indexing.
    // For now, fetching all users and updating if needed:
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
  } catch (error: any) {
    console.error("[renameSemester] Error renaming semester in Firestore and related data:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

export const deleteSemester = async (semesterName: string): Promise<boolean> => {
  checkFirebaseConfig();
  const trimmedName = semesterName.trim();
  if (!trimmedName) return false;
  try {
    const batch = writeBatch(db);
    const q = query(semestersCollectionRef, where("nameLower", "==", trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.warn(`Semester "${trimmedName}" not found for deletion in Firestore.`);
      return false;
    }
    const semesterDoc = querySnapshot.docs[0];
    batch.delete(doc(db, "semesters", semesterDoc.id));

    // Update users' semester assignments
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

    // Delete marks associated with this semester
    // Recommendation: Index `semester` in `marks`
    const marksQuery = query(marksCollectionRef, where("semester", "==", trimmedName));
    const marksSnapshot = await getDocs(marksQuery);
    marksSnapshot.forEach(markDoc => {
      batch.delete(doc(db, "marks", markDoc.id));
    });

    await batch.commit();
    return true;
  } catch (error: any) {
    console.error("[deleteSemester] Error deleting semester from Firestore and related data:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

// --- User Management Functions (Firestore-backed) ---
export const getUserByEmail = async (emailInput: string): Promise<User | undefined> => {
  checkFirebaseConfig();
  const trimmedEmail = emailInput.trim().toLowerCase(); // Ensure robust trimming and lowercasing here
  try {
    // Recommendation: Index `email` in `users`
    const q = query(usersCollectionRef, where("email", "==", trimmedEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as Omit<User, 'id'>;
      return { id: userDoc.id, ...userData };
    }
    console.warn(`[getUserByEmail] User with email |${trimmedEmail}| not found in Firestore.`);
    return undefined;
  } catch (error: any) {
    console.error(`[getUserByEmail] Error fetching user by email |${trimmedEmail}| from Firestore:`, error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // If permission error, specific Firestore rules are needed.
    // For other errors (like network), throw a distinct error.
    throw new Error("DatabaseQueryFailed");
  }
};

export const createUser = async (userData: Omit<User, 'id' | 'subjects' | 'semesterAssignments'> & { prn?: string, subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  checkFirebaseConfig();
  try {
    const dataForFirestore: { [key: string]: any } = {
      email: userData.email.trim().toLowerCase(),
      name: userData.name.trim(),
      role: userData.role,
      subjects: userData.subjects || [],
      semesterAssignments: userData.semesterAssignments || [],
      createdAt: Timestamp.now(),
    };

    const existingEmailCheck = await getDocs(query(usersCollectionRef, where("email", "==", dataForFirestore.email)));
    if (!existingEmailCheck.empty) {
      throw new Error(`User with email ${dataForFirestore.email} already exists.`);
    }

    if (userData.role === 'student') {
      if (!userData.prn || userData.prn.trim() === '') {
        throw new Error("PRN is required for student registration.");
      }
      const prnValue = userData.prn.trim().toUpperCase();
      // Recommendation: Index `prn` and `role` in `users`
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
  } catch (error: any) {
    console.error("[createUser] Error creating user in Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Order by a field like `createdAt` or `name` if needed for consistent ordering
    const querySnapshot = await getDocs(query(usersCollectionRef, orderBy("name")));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error: any) {
    console.error("[getAllUsers] Error fetching all users from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return [];
  }
};

export const getAllTeachers = async (): Promise<User[]> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `role` and `name` in `users`
    const q = query(usersCollectionRef, where("role", "in", ["teacher", "admin"]), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error: any) {
    console.error("[getAllTeachers] Error fetching teachers from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return [];
  }
};

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  checkFirebaseConfig();
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists() || (userDocSnap.data().role !== 'teacher' && userDocSnap.data().role !== 'admin')) {
      console.warn(`User ${userId} not found or not a teacher/admin.`);
      return undefined;
    }
    await updateDoc(userDocRef, { subjects: [...new Set(subjects)].sort(), updatedAt: Timestamp.now() });
    const updatedUserDoc = await getDoc(userDocRef);
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;
  } catch (error: any) {
    console.error("[assignSubjectsToTeacher] Error assigning subjects to teacher in Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return undefined;
  }
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjectsToAssign: string[]): Promise<User | undefined> => {
  checkFirebaseConfig();
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
      const sortedSubjects = [...new Set(subjectsToAssign)].sort();

      if (existingAssignmentIndex !== -1) {
        if (sortedSubjects.length === 0) {
          // If no subjects are selected for an existing assignment, remove the assignment
          semesterAssignments.splice(existingAssignmentIndex, 1);
        } else {
          semesterAssignments[existingAssignmentIndex].subjects = sortedSubjects;
        }
      } else if (sortedSubjects.length > 0) {
        // Add new assignment only if there are subjects to assign
        semesterAssignments.push({ semester, subjects: sortedSubjects });
      }
      semesterAssignments.sort((a,b) => a.semester.localeCompare(b.semester)); // Keep sorted
      transaction.update(userDocRef, { semesterAssignments, updatedAt: Timestamp.now() });
    });
    const updatedUserDoc = await getDoc(userDocRef); // Re-fetch the user document to get the latest data
    return { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;
  } catch (error: any) {
    console.error("[assignSubjectsToTeacherForSemester] Error assigning subjects for semester in Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    throw new Error("DatabaseTransactionFailed");
  }
};

// --- Student and Mark Management Functions (Firestore-backed) ---
export const getAllStudents = async (): Promise<Omit<Student, 'marks'>[]> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `role` and `name` in `users`
    const studentUsersQuery = query(usersCollectionRef, where("role", "==", "student"), orderBy("name"));
    const studentUsersSnapshot = await getDocs(studentUsersQuery);
    const students: Omit<Student, 'marks'>[] = studentUsersSnapshot.docs.map(userDoc => {
      const userData = userDoc.data() as User;
      if (!userData.prn) {
        console.warn(`[getAllStudents] Student user ${userData.name} (ID: ${userDoc.id}) is missing PRN. Skipping.`);
        return null;
      }
      return {
        id: userData.prn!, // PRN is student ID
        name: userData.name,
        email: userData.email,
      };
    }).filter(student => student !== null) as Omit<Student, 'marks'>[];
    return students;
  } catch (error: any) {
    console.error("[getAllStudents] Error fetching all student profiles from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return [];
  }
};

export const getAllMarks = async (semester?: Semester): Promise<Mark[]> => {
  checkFirebaseConfig();
  try {
    const constraints: QueryConstraint[] = [];
    if (semester) {
      // Recommendation: Index `semester` in `marks`
      constraints.push(where("semester", "==", semester));
    }
    // Example: constraints.push(orderBy("studentId"), orderBy("subject"));
    const q = query(marksCollectionRef, ...constraints);
    const marksSnapshot = await getDocs(q);
    return marksSnapshot.docs.map(markDoc => ({
        id: markDoc.id,
        ...markDoc.data()
    } as Mark));
  } catch (error: any) {
    console.error(`[getAllMarks] Error fetching marks ${semester ? `for semester ${semester}` : ''} from Firestore:`, error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return [];
  }
};

export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `prn` and `role` in `users`
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);
    if (studentUserSnapshot.empty) {
      console.warn(`[getStudentByPrn] Student user with PRN ${prn} not found.`);
      return undefined;
    }
    const userDoc = studentUserSnapshot.docs[0];
    const userData = userDoc.data() as User;

    // Recommendation: Index `studentId` in `marks` for efficient mark fetching per student
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
  } catch (error: any) {
    console.error(`[getStudentByPrn] Error fetching student by PRN ${prn} from Firestore:`, error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return undefined;
  }
};

export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `prn` and `role` in `users` for student check
    const studentQuery = query(usersCollectionRef, where("prn", "==", markData.studentId), where("role", "==", "student"));
    const studentSnapshot = await getDocs(studentQuery);
    if (studentSnapshot.empty) {
      throw new Error(`Student with PRN ${markData.studentId} not found. Cannot add mark.`);
    }

    // Recommendation: Composite Index on `studentId`, `subject`, `semester`, `assessmentType` in `marks`
    const markCheckQuery = query(marksCollectionRef,
        where("studentId", "==", markData.studentId),
        where("subject", "==", markData.subject),
        where("semester", "==", markData.semester),
        where("assessmentType", "==", markData.assessmentType)
    );
    const markCheckSnapshot = await getDocs(markCheckQuery);
    if (!markCheckSnapshot.empty) {
        console.warn(`Mark for ${markData.assessmentType} in ${markData.subject} (${markData.semester}) for student ${markData.studentId} already exists. Updating instead.`);
        const existingMarkDoc = markCheckSnapshot.docs[0];
        await updateDoc(doc(db, "marks", existingMarkDoc.id), { ...markData, updatedAt: Timestamp.now() });
        return { id: existingMarkDoc.id, ...markData };
    }

    const docRef = await addDoc(marksCollectionRef, { ...markData, createdAt: Timestamp.now() });
    return { id: docRef.id, ...markData };
  } catch (error: any) {
    console.error("[addMark] Error adding or updating mark in Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    throw error;
  }
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  checkFirebaseConfig();
  try {
    const markDocRef = doc(db, "marks", updatedMark.id);
    const { id, ...markDataToUpdate } = updatedMark; // Exclude 'id' from the data to be updated
    await updateDoc(markDocRef, { ...markDataToUpdate, updatedAt: Timestamp.now() });
    return updatedMark;
  } catch (error: any) {
    console.error("[updateMark] Error updating mark in Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return undefined;
  }
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  checkFirebaseConfig();
  try {
    const markDocRef = doc(db, "marks", markId);
    await deleteDoc(markDocRef);
    return true;
  } catch (error: any) {
    console.error("[deleteMark] Error deleting mark from Firestore:", error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return false;
  }
};

export const updateStudentName = async (prn: string, newName: string): Promise<Omit<Student, 'marks'> | undefined> => {
  checkFirebaseConfig();
  try {
    // Recommendation: Index `prn` and `role` in `users` for student check
    const studentUserQuery = query(usersCollectionRef, where("role", "==", "student"), where("prn", "==", prn));
    const studentUserSnapshot = await getDocs(studentUserQuery);
    if (studentUserSnapshot.empty) {
      console.warn(`[updateStudentName] Student user with PRN ${prn} not found for name update.`);
      return undefined;
    }
    const userDocToUpdate = studentUserSnapshot.docs[0];
    const userDocRef = doc(db, "users", userDocToUpdate.id);
    await updateDoc(userDocRef, { name: newName.trim(), updatedAt: Timestamp.now() });

    const updatedUserSnap = await getDoc(userDocRef); // Re-fetch to confirm update
    if (!updatedUserSnap.exists()) { // Should not happen if update was successful
        console.warn(`[updateStudentName] Updated student user with PRN ${prn} not found after update attempt.`);
        return undefined;
    }
    const updatedUserData = updatedUserSnap.data() as User;
    return {
      id: updatedUserData.prn!,
      name: updatedUserData.name,
      email: updatedUserData.email,
    };
  } catch (error: any) {
    console.error(`[updateStudentName] Error updating student name for PRN ${prn} in Firestore:`, error);
    if (error.message === "FirebaseMisconfigured") throw error;
    // Check Firestore Security Rules if permission denied
    return undefined;
  }
};
    
