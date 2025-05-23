
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getAllUsers } from '@/lib/mockData';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search, Users2 as UsersIcon } from 'lucide-react';

export function UserListTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error fetching users", description: "Could not load user data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.prn && user.prn.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading users...</span></div>;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" /> User Management
        </CardTitle>
        <CardDescription>View and manage all users in the system (students, teachers, and administrators).</CardDescription>
        <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search by name, email, role, or PRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-2/3 lg:w-1/2 pl-10"
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
             <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No users found {searchTerm && `for "${searchTerm}"`}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm ? "Try a different search term." : "User data will appear here. Ensure users are registered in Firestore."}
                </p>
            </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] min-w-[100px]">User ID</TableHead>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="text-center min-w-[100px]">Role</TableHead>
                  <TableHead className="min-w-[200px]">Details (PRN/Subjects)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-xs">{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          user.role === 'admin' ? 'destructive' :
                          user.role === 'teacher' ? 'secondary' : 'default'
                        }
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.role === 'student' && user.prn ? `PRN: ${user.prn}` : ''}
                      {(user.role === 'teacher' || user.role === 'admin') && user.subjects && user.subjects.length > 0 ? `Gen. Subjects: ${user.subjects.join(', ')}` : (user.role === 'teacher' || user.role === 'admin') ? 'No general subjects' : ''}
                      {(user.role === 'teacher' || user.role === 'admin') && user.semesterAssignments && user.semesterAssignments.length > 0 ? 
                        user.semesterAssignments.map(sa => ` (${sa.semester}: ${sa.subjects.join(', ') || 'None'})`).join('; ')
                        : ''
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
