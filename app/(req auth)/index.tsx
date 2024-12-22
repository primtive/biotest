"use client"
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form"
import { z } from "zod";

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Выберите хотя бы одну тему",
  }),
})

export default function Index({ topics }: { topics: Array<{ name: string, id: string }> }) {
  const [mode, setMode] = React.useState(false);
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
  })

  async function start() {

    if (!mode) router.push('/t')
    const isSelected = await form.trigger('items')
    if (isSelected) {
      router.push('/t?topics='+form.getValues().items.join(','))
    }
  }

  return (
    <>
      <hr />
      <div className="flex w-full gap-2 justify-evenly">

        <Card className="w-full flex flex-col items-center justify-between space-y-2">
          <p>Все задания сайта в перемешку</p>
          <div className="mt-auto">
            <Button variant={mode ? "default" : "secondary"} onClick={() => setMode(false)}>Выбрать</Button>
          </div>
        </Card>

        <Card className="w-full flex flex-col items-center justify-between space-y-2">
          <p>Выбрать нужные темы</p>
          <div className="mt-auto">
            <Button variant={!mode ? "default" : "secondary"} onClick={() => setMode(true)}>Выбрать</Button>
          </div>
        </Card>

      </div>
      {mode &&
        <Card>
          <p>Темы</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(start)}>
              <Table>
                <TableBody>
                  <FormField
                    control={form.control}
                    name="items"
                    render={() => (
                      <FormItem>
                        {topics.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="items"
                            render={({ field }) => {
                              return (
                                // <FormControl>
                                <TableRow>
                                  <TableCell className="flex items-center">
                                    <FormItem key={item.id}>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                        }}
                                      />
                                      <FormLabel className="text-md ml-2">
                                        {item.name}
                                      </FormLabel>
                                    </FormItem>
                                  </TableCell>
                                </TableRow>
                                // </FormControl>
                              )
                            }}
                          />
                        ))}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableBody>
              </Table>
            </form>
          </Form>
        </Card>}
      <div className="mx-2 pt-2">
        <Button className="w-full text-lg h-10" onClick={() => start()}>Начать</Button>
      </div>
      {/* <hr /> */}
      {/* <Card> */}
      {/* Статистика */}
      {/* </Card> */}
    </>
  );
}
