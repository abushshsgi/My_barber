import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { fetchAdminBarbers, fetchAdminSalons, type AdminBarber, type AdminSalon } from "@/lib/admin-api";
import { UZ_REGIONS, type UzRegionCode } from "@/lib/uz-regions";

const regionSchema = z.enum(UZ_REGIONS.map((r) => r.value) as [UzRegionCode, ...UzRegionCode[]]);
const DEFAULT_REGION: UzRegionCode = "TOSHKENT_V";

// Reusable shell
export function EditDialogShell({
  open,
  onOpenChange,
  title,
  description,
  loading,
  onSubmit,
  children,
  submitLabel = "Saqlash",
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  loading?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", contentClassName)}>
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Saqlanmoqda..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== USER ===================
const userSchema = z.object({
  name: z.string().min(2, "Kamida 2 ta belgi"),
  phone: z.string().min(7, "Telefon noto'g'ri"),
  email: z.string().email("Email noto'g'ri"),
  region: regionSchema,
  is_active: z.boolean(),
});
export type UserFormValues = z.infer<typeof userSchema>;

export function EditUserDialog({
  open,
  onOpenChange,
  defaultValues,
  loading,
  onSave,
  mode = "edit",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<UserFormValues>;
  loading?: boolean;
  onSave: (v: UserFormValues) => void;
  mode?: "edit" | "create";
}) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      region: DEFAULT_REGION,
      is_active: true,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        name: "",
        phone: "",
        email: "",
        region: DEFAULT_REGION,
        is_active: true,
        ...defaultValues,
      });
  }, [open, defaultValues, form]);

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Yangi mijoz" : "Mijozni tahrirlash"}
      loading={loading}
      onSubmit={form.handleSubmit(onSave)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ism</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+998 ..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            name="region"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hudud</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as UzRegionCode)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {UZ_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="is_active"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <FormLabel>Faol holat</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faol emas mijozlar tizimga kira olmaydi
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== BARBER ===================
const barberSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  avatar: z.string().url().or(z.literal("")),
  region: regionSchema,
  salon_id: z.string().nullable(),
  salon_name: z.string().nullable(),
  is_active: z.boolean(),
});
export type BarberFormValues = z.infer<typeof barberSchema>;

export function EditBarberDialog({
  open,
  onOpenChange,
  defaultValues,
  salons,
  loading,
  onSave,
  mode = "edit",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<BarberFormValues>;
  salons: Array<{ id: string; name: string }>;
  loading?: boolean;
  onSave: (v: BarberFormValues) => void;
  mode?: "edit" | "create";
}) {
  const form = useForm<BarberFormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      name: "",
      phone: "",
      avatar: "",
      region: DEFAULT_REGION,
      salon_id: null,
      salon_name: null,
      is_active: true,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        name: "",
        phone: "",
        avatar: "",
        region: DEFAULT_REGION,
        salon_id: null,
        salon_name: null,
        is_active: true,
        ...defaultValues,
      });
  }, [open, defaultValues, form]);

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Yangi sartarosh" : "Sartaroshni tahrirlash"}
      loading={loading}
      onSubmit={form.handleSubmit(onSave)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ism</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="region"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hudud</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as UzRegionCode)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UZ_REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <FormField
            name="avatar"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="salon_id"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salon</FormLabel>
                <Select
                  value={field.value ?? "_none"}
                  onValueChange={(v) => {
                    if (v === "_none") {
                      field.onChange(null);
                      form.setValue("salon_name", null);
                    } else {
                      field.onChange(v);
                      form.setValue("salon_name", salons.find((s) => s.id === v)?.name ?? null);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Mustaqil sartarosh</SelectItem>
                    {salons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            name="is_active"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between border border-border rounded-lg p-3">
                <FormLabel>Faol</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== SALON ===================
const salonSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(3),
  region: regionSchema,
  published: z.boolean(),
});
export type SalonFormValues = z.infer<typeof salonSchema>;

export function EditSalonDialog({
  open,
  onOpenChange,
  defaultValues,
  loading,
  onSave,
  mode = "edit",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<SalonFormValues>;
  loading?: boolean;
  onSave: (v: SalonFormValues) => void;
  mode?: "edit" | "create";
}) {
  const form = useForm<SalonFormValues>({
    resolver: zodResolver(salonSchema),
    defaultValues: {
      name: "",
      address: "",
      region: DEFAULT_REGION,
      published: false,
      ...defaultValues,
    },
  });
  useEffect(() => {
    if (open)
      form.reset({
        name: "",
        address: "",
        region: DEFAULT_REGION,
        published: false,
        ...defaultValues,
      });
  }, [open, defaultValues, form]);

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Yangi salon" : "Salonni tahrirlash"}
      loading={loading}
      onSubmit={form.handleSubmit(onSave)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salon nomi</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="address"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manzil</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="region"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hudud</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as UzRegionCode)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {UZ_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            name="published"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <FormLabel>Chiqarilgan</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Mijozlar uchun ko'rinadi</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== SERVICE ===================
const serviceEditSchema = z.object({
  name: z.string().min(2),
  category_id: z.string().min(1),
  price: z.number().min(0),
  duration_min: z.number().min(5),
  is_active: z.boolean(),
});

const serviceCreateSchema = serviceEditSchema
  .extend({
    service_type: z.enum(["salon", "independent"]),
    salon_id: z.string(),
    barber_id: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.service_type === "salon") {
      if (!data.salon_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Salonni tanlang",
          path: ["salon_id"],
        });
      }
    } else if (!data.barber_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Barberni tanlang",
        path: ["barber_id"],
      });
    }
  });

export type ServiceFormValues = z.infer<typeof serviceEditSchema>;
export type ServiceCreateFormValues = z.infer<typeof serviceCreateSchema>;

const SEARCH_DEBOUNCE_MS = 320;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function SalonCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [rows, setRows] = useState<AdminSalon[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchAdminSalons({ q: debouncedSearch, page: 1, published: "all" })
      .then((pag) => {
        if (!cancelled) setRows(pag.results);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!value) {
      setLabel("");
      return;
    }
    const hit = rows.find((r) => r.id === value);
    if (hit) setLabel(hit.name);
  }, [value, rows]);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {value ? label || `ID: ${value}` : "Salonni qidiring…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Salon nomi…" value={search} onValueChange={setSearch} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Yuklanmoqda…
              </div>
            ) : (
              <>
                <CommandEmpty>Hech narsa topilmadi</CommandEmpty>
                <CommandGroup>
                  {rows.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`${s.id}-${s.name}`}
                      onSelect={() => {
                        onChange(s.id);
                        setLabel(s.name);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn("mr-2 size-4", value === s.id ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{s.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BarberCombobox({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [rows, setRows] = useState<AdminBarber[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchAdminBarbers({ q: debouncedSearch, page: 1 })
      .then((pag) => {
        if (!cancelled) setRows(pag.results);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!value) {
      setLabel("");
      return;
    }
    const hit = rows.find((r) => r.id === value);
    if (hit) setLabel([hit.name, hit.phone].filter(Boolean).join(" · ") || `ID ${hit.id}`);
  }, [value, rows]);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {value ? label || `ID: ${value}` : "Barberni qidiring…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Ism yoki telefon…" value={search} onValueChange={setSearch} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Yuklanmoqda…
              </div>
            ) : (
              <>
                <CommandEmpty>Hech narsa topilmadi</CommandEmpty>
                <CommandGroup>
                  {rows.map((b) => {
                    const line = [b.name, b.phone].filter(Boolean).join(" · ") || `ID ${b.id}`;
                    return (
                      <CommandItem
                        key={b.id}
                        value={`${b.id}-${line}`}
                        onSelect={() => {
                          onChange(b.id);
                          setLabel(line);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <Check
                          className={cn("mr-2 size-4", value === b.id ? "opacity-100" : "opacity-0")}
                        />
                        <span className="truncate">{line}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EditServiceDialog({
  open,
  onOpenChange,
  defaultValues,
  categories,
  loading,
  onSave,
  mode = "edit",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<ServiceFormValues>;
  categories: Array<{ id: string; name: string; icon: string }>;
  loading?: boolean;
  onSave: (v: ServiceFormValues | ServiceCreateFormValues) => void;
  mode?: "edit" | "create";
}) {
  const schema = mode === "create" ? serviceCreateSchema : serviceEditSchema;
  const createFieldDefaults = useMemo(
    () =>
      mode === "create"
        ? ({ service_type: "salon" as const, salon_id: "", barber_id: "" } satisfies Partial<ServiceCreateFormValues>)
        : {},
    [mode],
  );

  const form = useForm<ServiceCreateFormValues | ServiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category_id: categories[0]?.id ?? "",
      price: 50000,
      duration_min: 30,
      is_active: true,
      ...createFieldDefaults,
      ...defaultValues,
    },
  });

  const serviceType = useWatch({
    control: form.control,
    name: "service_type",
    disabled: mode !== "create",
  }) as ServiceCreateFormValues["service_type"] | undefined;

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      category_id: categories[0]?.id ?? "",
      price: 50000,
      duration_min: 30,
      is_active: true,
      ...createFieldDefaults,
      ...defaultValues,
    });
  }, [open, defaultValues, form, categories, createFieldDefaults]);

  const handleSubmit = useCallback(
    (v: ServiceCreateFormValues | ServiceFormValues) => {
      onSave(v);
    },
    [onSave],
  );

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Yangi xizmat" : "Xizmatni tahrirlash"}
      loading={loading}
      onSubmit={form.handleSubmit(handleSubmit)}
      contentClassName={mode === "create" ? "max-w-xl" : undefined}
    >
      <Form {...form}>
        <form className="space-y-4">
          {mode === "create" ? (
            <>
              <FormField
                name="service_type"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xizmat turi</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("salon_id", "");
                        form.setValue("barber_id", "");
                        void form.trigger(["salon_id", "barber_id"]);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="salon">Salon xizmati</SelectItem>
                        <SelectItem value="independent">Mustaqil barber</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {serviceType === "independent" ? (
                <FormField
                  name="barber_id"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barber</FormLabel>
                      <FormControl>
                        <BarberCombobox value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  name="salon_id"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salon</FormLabel>
                      <FormControl>
                        <SalonCombobox value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          ) : null}
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomi</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="category_id"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kategoriya</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="price"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Narx (so'm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="duration_min"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Davomiyligi (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            name="is_active"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between border border-border rounded-lg p-3">
                <FormLabel>Faol</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== BOOKING ===================
const bookingSchema = z.object({
  status: z.enum(["pending", "confirmed", "in_chair", "completed", "cancelled"]),
  price: z.number().min(0),
});
export type BookingFormValues = z.infer<typeof bookingSchema>;

export function EditBookingDialog({
  open,
  onOpenChange,
  defaultValues,
  loading,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<BookingFormValues>;
  loading?: boolean;
  onSave: (v: BookingFormValues) => void;
}) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { status: "pending", price: 80000, ...defaultValues },
  });
  useEffect(() => {
    if (open) form.reset({ status: "pending", price: 80000, ...defaultValues });
  }, [open, defaultValues, form]);

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Bronni tahrirlash"
      loading={loading}
      onSubmit={form.handleSubmit(onSave)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="status"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Holat</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Kutilmoqda</SelectItem>
                    <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                    <SelectItem value="in_chair">Kresloda</SelectItem>
                    <SelectItem value="completed">Yakunlangan</SelectItem>
                    <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            name="price"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Narx</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== TICKET ===================
const ticketSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assignee: z.string().nullable(),
});
export type TicketFormValues = z.infer<typeof ticketSchema>;

export function EditTicketDialog({
  open,
  onOpenChange,
  defaultValues,
  loading,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<TicketFormValues>;
  loading?: boolean;
  onSave: (v: TicketFormValues) => void;
}) {
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { status: "open", priority: "normal", assignee: null, ...defaultValues },
  });
  useEffect(() => {
    if (open) form.reset({ status: "open", priority: "normal", assignee: null, ...defaultValues });
  }, [open, defaultValues, form]);

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Murojaatni tahrirlash"
      loading={loading}
      onSubmit={form.handleSubmit(onSave)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="status"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Holat</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Ochiq</SelectItem>
                    <SelectItem value="pending">Kutilmoqda</SelectItem>
                    <SelectItem value="resolved">Hal qilindi</SelectItem>
                    <SelectItem value="closed">Yopildi</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            name="priority"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioritet</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Past</SelectItem>
                    <SelectItem value="normal">Oddiy</SelectItem>
                    <SelectItem value="high">Yuqori</SelectItem>
                    <SelectItem value="urgent">Shoshilinch</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            name="assignee"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mas'ul admin</FormLabel>
                <Select
                  value={field.value ?? "_none"}
                  onValueChange={(v) => field.onChange(v === "_none" ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Biriktirilmagan</SelectItem>
                    <SelectItem value="Admin Karimov">Admin Karimov</SelectItem>
                    <SelectItem value="Moderator Aliyev">Moderator Aliyev</SelectItem>
                    <SelectItem value="Support Yusupov">Support Yusupov</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditDialogShell>
  );
}

// =================== BROADCAST ===================
const broadcastSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(5),
  audience: z.enum(["all", "users", "barbers", "region"]),
  region: regionSchema.optional(),
  channel: z.enum(["push", "sms", "both"]),
});
export type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export function NewBroadcastDialog({
  open,
  onOpenChange,
  loading,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading?: boolean;
  onSend: (v: BroadcastFormValues) => void;
}) {
  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", body: "", audience: "all", channel: "push" },
  });
  useEffect(() => {
    if (open) form.reset({ title: "", body: "", audience: "all", channel: "push" });
  }, [open, form]);

  const audience = form.watch("audience");

  return (
    <EditDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Yangi xabarnoma yuborish"
      submitLabel="Yuborish"
      loading={loading}
      onSubmit={form.handleSubmit(onSend)}
    >
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            name="title"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sarlavha</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="body"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matn</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="audience"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kimga</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Hammaga</SelectItem>
                      <SelectItem value="users">Mijozlarga</SelectItem>
                      <SelectItem value="barbers">Sartaroshlarga</SelectItem>
                      <SelectItem value="region">Hudud bo'yicha</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              name="channel"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kanal</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="push">Push</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Push + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          {audience === "region" && (
            <FormField
              name="region"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hudud</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Hududni tanlang" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UZ_REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    </EditDialogShell>
  );
}
