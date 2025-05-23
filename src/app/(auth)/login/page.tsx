
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, AlertCircle } from "lucide-react"; 
import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["student", "teacher", "admin"], { required_error: "You must select a role." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { login, isFirebaseMisconfiguredError } = useAuth(); // Get isFirebaseMisconfiguredError
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "student",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const success = await login(values.email, values.password, values.role as Role);
    setIsLoading(false);

    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      if (values.role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (values.role === "student") {
        router.push("/student/dashboard");
      } else if (values.role === "admin") {
        router.push("/admin/dashboard");
      }
    } else {
      // Toast for login failure is handled by AuthContext or getUserByEmail now if specific
      // Or if isFirebaseMisconfiguredError is true, a prominent message is shown
    }
  }

  if (!isClient) {
    return (
      <div className="text-center p-6">
        <p className="text-lg text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-foreground">
        Sign In to CampusMarks
      </h1>

      {isFirebaseMisconfiguredError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Configuration Error!</AlertTitle>
          <AlertDescription className="mt-2 text-base">
            <p className="font-medium">The application cannot connect to the database.</p>
            <p className="mt-1">Please ask the website administrator to update the Firebase configuration in the file:</p>
            <code className="mt-1 mb-2 block rounded bg-muted px-2 py-1 text-sm font-mono">src/lib/firebaseConfig.ts</code>
            <p>This file contains placeholder values (like "YOUR_API_KEY_HERE") that must be replaced with real project credentials.</p>
          </AlertDescription>
        </Alert>
      )}

      {!isFirebaseMisconfiguredError && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="you@example.com" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-foreground/80">I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="student" id="role-student"/>
                        </FormControl>
                        <FormLabel htmlFor="role-student" className="font-normal text-foreground/90">Student</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="teacher" id="role-teacher"/>
                        </FormControl>
                        <FormLabel htmlFor="role-teacher" className="font-normal text-foreground/90">Teacher</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="admin" id="role-admin"/>
                        </FormControl>
                        <FormLabel htmlFor="role-admin" className="font-normal text-foreground/90">Admin</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Sign Up
        </Link>
      </p>
    </>
  );
}
