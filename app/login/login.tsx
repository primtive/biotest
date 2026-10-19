"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signIn } from "next-auth/react";
import * as React from "react"
import { PasswordInput } from "@/components/password-input"
import { errorMessage } from '@/lib/client-request';

const formSchema = z.object({
  username: z
    .string({ message: 'Введите имя пользователя' }).trim().min(1, 'Введите имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
})

export default function LoginForm() {
  const [loading, setLoading] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        callbackUrl: '/', redirect: false, username: values.username, password: values.password,
      });
      if (!res?.ok || res.error) {
        form.setError('root', { message: 'Неверное имя пользователя или пароль' });
      } else {
        window.location.href = res.url || '/';
      }
    } catch (error) {
      form.setError('root', { message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="text-2xl">Вход</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Имя пользователя
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="username" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Пароль</FormLabel>
                <FormControl><PasswordInput autoComplete="current-password" disabled={loading} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {form.formState.errors.root && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
            <Button type="submit" disabled={loading} className="w-full">Вход</Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-sm">
          Если вы забыли имя пользователя, напишите <a href="https://t.me/alariklorens" className="font-semibold">@alariklorens</a>
        </p>
      </CardFooter>
    </Card>
  )
}
