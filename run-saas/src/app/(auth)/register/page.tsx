// app/(auth)/register/page.tsx
import { Metadata } from "next";
import { RegistrationForm } from "@/components/registration";

export const metadata: Metadata = {
  title: "Student Registration | Weekend Academy",
  description:
    "Register for Weekend Academy courses and start your learning journey",
};

export default function RegisterPage() {
  return <RegistrationForm />;
}
