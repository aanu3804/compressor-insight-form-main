import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbwR0CU9AATBHzUgxmCj1nOHxIVg1aep1HyvULT0_q6cRT_QIE0oPfeyA-YHb5ahaXudNA/exec"; // tested Postman API URL
const MAX_STEPS = 4;
const STORAGE_KEY = "compressorFormData";
const STORAGE_STEP_KEY = "compressorFormStep";

const NAMES = [
  "Debajit Guha", "Avijit Ghosh", "Souvik Santra", "Souvik Sarkar", "Rajib Dey", "Indranath Biswas",
  "Mintu Chatterjee", "Tanmoy Khamrui", "Sanjib Mondal", "Asim Sarkar", "Amit Sarkar", "Atanu Ghosh",
  "Surojit Mondal", "Mayukh Bose", "Bidhan Barman"
];

const BRANDS = [
  { value: "CP", label: "Chicago Pneumatic (CP)" },
  { value: "AC", label: "Atlas Copco (AC)" },
  { value: "Elgi", label: "Elgi" },
  { value: "Kirloskar", label: "Kirloskar" },
  { value: "IR", label: "Ingersoll Rand (IR)" },
  { value: "Boge", label: "Boge" },
  { value: "Other", label: "Other" },
];

const SIZES = ["<30kw", "30 to 75kw", ">75kw"];

type CompressorDetail = {
  brand: string;
  otherBrandName?: string;
  size: string;
  year: string;
  runningHours: string;
  loadingHours: string;
  photoLink?: string;
  uploading?: boolean;
  uploadError?: string | null;
};

type FormDataShape = {
  name: string;
  date: string;
  customer: {
    companyName: string;
    address: string;
    pincode: string;
    contactPerson: string;
    contactNumber: string;
  };
  companyPhotoLink?: string;
  companyPhotoUploading?: boolean;
  companyPhotoError?: string | null;
  compressorCount: string;
  compressors: CompressorDetail[];
};

const defaultForm: FormDataShape = {
  name: "",
  date: "",
  customer: {
    companyName: "",
    address: "",
    pincode: "",
    contactPerson: "",
    contactNumber: "",
  },
  companyPhotoLink: "",
  companyPhotoUploading: false,
  companyPhotoError: null,
  compressorCount: "1",
  compressors: [
    { brand: "", otherBrandName: "", size: "", year: "", runningHours: "", loadingHours: "", photoLink: "" },
  ],
};

export default function CompressorForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_STEP_KEY));
    return saved && saved >= 1 && saved <= MAX_STEPS ? saved : 1;
  });
  const [form, setForm] = useState<FormDataShape>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultForm;
  });
  const [successOpen, setSuccessOpen] = useState(false);

  const progress = useMemo(() => (step / MAX_STEPS) * 100, [step]);

  // Autosave
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);
  useEffect(() => {
    localStorage.setItem(STORAGE_STEP_KEY, String(step));
  }, [step]);

  // Adjust compressors array when count changes
  useEffect(() => {
    if (form.compressorCount === "more") return;
    const n = Number(form.compressorCount || 0);
    if (!Number.isFinite(n) || n < 1) return;
    setForm((prev) => {
      const curr = prev.compressors || [];
      const next = [...curr];
      if (curr.length < n) {
        for (let i = curr.length; i < n; i++) {
          next.push({ brand: "", size: "", year: "", runningHours: "", loadingHours: "", photoLink: "" });
        }
      } else if (curr.length > n) {
        next.length = n;
      }
      return { ...prev, compressors: next };
    });
  }, [form.compressorCount]);

  const onNext = () => {
    if (step === 3 && form.compressorCount === "more") {
      navigate("/contact-pradeep");
      return;
    }
    setStep((s) => Math.min(MAX_STEPS, s + 1));
  };
  const onBack = () => setStep((s) => Math.max(1, s - 1));

  // Convert file to base64 and send as JSON to GAS
  const uploadBase64 = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = {
      filename: file.name,
      mimeType: file.type,
      data: base64
    };

    const res = await fetch(GAS_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === "success" && data.link) {
      return data.link;
    }
    throw new Error(data.message || "Upload failed");
  };

  const handleUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], uploading: true, uploadError: null };
      return { ...prev, compressors: copy };
    });

    try {
      const link = await uploadBase64(file);
      setForm((prev) => {
        const copy = [...prev.compressors];
        copy[index] = { ...copy[index], photoLink: link, uploading: false };
        return { ...prev, compressors: copy };
      });
      toast.success("Photo uploaded");
    } catch (err: any) {
      setForm((prev) => {
        const copy = [...prev.compressors];
        copy[index] = { ...copy[index], uploading: false, uploadError: err?.message || "Upload error" };
        return { ...prev, compressors: copy };
      });
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleCompanyPhotoUpload = async (file: File | null) => {
    if (!file) return;
    setForm((prev) => ({ ...prev, companyPhotoUploading: true, companyPhotoError: null }));

    try {
      const link = await uploadBase64(file);
      setForm((prev) => ({ ...prev, companyPhotoLink: link, companyPhotoUploading: false }));
      toast.success("Company photo uploaded");
    } catch (err: any) {
      setForm((prev) => ({ ...prev, companyPhotoUploading: false, companyPhotoError: err?.message || "Upload error" }));
      toast.error("Company photo upload failed. Please try again.");
      console.log(err.message);
    }
  };

  const handleSubmit = async () => {
    toast.success("Form submitted successfully!");
    setSuccessOpen(true);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_STEP_KEY);
  };

  function updateCompressor(index: number, patch: Partial<CompressorDetail>) {
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, compressors: copy };
    });
  }

  return (
    <div className="container mx-auto py-10">
      <Helmet>
        <title>Industrial Visit - Compressor Data Collection - Trinity</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <Progress value={progress} />

        <Card>
          <CardHeader>
            <CardTitle>Step {step} of {MAX_STEPS}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Select Name</Label>
                  <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                    <SelectTrigger id="name">
                      <SelectValue placeholder="Choose name" />
                    </SelectTrigger>
                    <SelectContent>
                      {NAMES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" value={form.customer.companyName} onChange={(e) => setForm({ ...form, customer: { ...form.customer, companyName: e.target.value } })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Company address</Label>
                  <Textarea id="address" value={form.customer.address} onChange={(e) => setForm({ ...form, customer: { ...form.customer, address: e.target.value } })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input id="pincode" placeholder="Pincode" value={form.customer.pincode} onChange={(e) => setForm({ ...form, customer: { ...form.customer, pincode: e.target.value } })} />
                  <Input id="contactPerson" placeholder="Contact person" value={form.customer.contactPerson} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactPerson: e.target.value } })} />
                  <Input id="contactNumber" placeholder="Contact number" value={form.customer.contactNumber} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactNumber: e.target.value } })} />
                </div>
                <Input type="file" accept="image/*" onChange={(e) => handleCompanyPhotoUpload(e.target.files?.[0] || null)} />
                {form.companyPhotoLink && <a href={form.companyPhotoLink} target="_blank" rel="noreferrer">View uploaded company photo</a>}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="compressorCount">Number of compressors</Label>
                <Select value={form.compressorCount} onValueChange={(v) => setForm({ ...form, compressorCount: v })}>
                  <SelectTrigger id="compressorCount">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                    <SelectItem value="more">More than 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-8">
                {form.compressors.map((comp, idx) => (
                  <div key={idx} className="rounded-md border p-4 space-y-4">
                    <h3 className="text-lg font-semibold">Compressor {idx + 1}</h3>
                    <Select value={comp.brand} onValueChange={(v) => updateCompressor(idx, { brand: v, ...(v !== "Other" ? { otherBrandName: "" } : {}) })}>
                      <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent>
                        {BRANDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {comp.brand === "Other" && (
                      <Input placeholder="Enter brand name" value={comp.otherBrandName || ""} onChange={(e) => updateCompressor(idx, { otherBrandName: e.target.value })} />
                    )}
                    <Select value={comp.size} onValueChange={(v) => updateCompressor(idx, { size: v })}>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent>
                        {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Year" value={comp.year} onChange={(e) => updateCompressor(idx, { year: e.target.value })} />
                    <Input placeholder="Running hours" value={comp.runningHours} onChange={(e) => updateCompressor(idx, { runningHours: e.target.value })} />
                    <Input placeholder="Loading hours" value={comp.loadingHours} onChange={(e) => updateCompressor(idx, { loadingHours: e.target.value })} />
                    <Input type="file" accept="image/*" onChange={(e) => handleUpload(idx, e.target.files?.[0] || null)} />
                    {comp.photoLink && <a href={comp.photoLink} target="_blank" rel="noreferrer">View uploaded photo</a>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="secondary" onClick={onBack} disabled={step === 1}>Back</Button>
            {step < MAX_STEPS ? (
              <Button onClick={onNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Submit</Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submission successful</AlertDialogTitle>
            <AlertDialogDescription>Your form has been submitted. Thank you!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setSuccessOpen(false); navigate("/"); }}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
