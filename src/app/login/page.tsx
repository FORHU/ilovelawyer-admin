"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { FloatingLabelInput } from "@/components/ui/floating-label-input"

// Login-time checks only: is a well-formed email present, was some password typed.
// Deliberately not enforcing signup's min-8-characters password rule here — an
// existing user's real password could be any shape from whenever they signed up.
const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  // UI shell only — no auth is wired up yet, so a valid submit just navigates through.
  function onSubmit() {
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            ilovelawyer admin — manage the platform.
          </p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FloatingLabelInput
              label="Email"
              type="email"
              autoComplete="email"
              icon={<Mail className="size-4" />}
              error={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <FloatingLabelInput
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              icon={<Lock className="size-4" />}
              error={!!errors.password}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              {...register("password")}
            />
            <div className="flex items-center justify-between">
              {errors.password ? (
                <p className="text-destructive text-xs">{errors.password.message}</p>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Forgot your password?
              </button>
            </div>
          </div>
          <Button type="submit" className="mt-2 h-11 w-full text-sm">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
