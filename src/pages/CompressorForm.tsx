import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbyZtVKMMzoEunRdz2Z04mAJ5paXNXH2Ip6XHVAKsAX2gLlGdxzDFyYjwnfTKPJu5OG1zw/exec";
const SUBMIT_URL = "YOUR_WEB_APP_URL"; // TODO: Replace with your Google Apps Script Web App URL for Google Sheets

const NAMES = [
  "Debajit Guha","Avijit Ghosh","Souvik Santra","Souvik Sarkar","Rajib Dey","Indranath Biswas","Mintu Chatterjee","Tanmoy Khamrui","Sanjib Mondal","Asim Sarkar","Amit Sarkar","Atanu Ghosh","Surojit Mondal","Mayukh Bose","Bidhan Barman"
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

const SIZES = ["<30kw", "30 to 75kw", ">75kw"]; // As provided

const MAX_STEPS = 4;
const STORAGE_KEY = "compressorFormData";
const STORAGE_STEP_KEY = "compressorFormStep";

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
  compressorCount: string; // "1".."10" or "more"
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

    const handleUpload = async (index: number, file: File | null) => {
      if (!file) return;
    
      setForm((prev) => {
        const copy = [...prev.compressors];
        copy[index] = { ...copy[index], uploading: true, uploadError: null };
        return { ...prev, compressors: copy };
      });
    
      try {
        const formData = new FormData();
        formData.append("file", await file.arrayBuffer().then(buf => btoa(String.fromCharCode(...new Uint8Array(buf)))));
    
        const res = await fetch(GAS_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
    
        const data = await res.json();
    
        if (data.status === "success" && data.link) {
          setForm((prev) => {
            const copy = [...prev.compressors];
            copy[index] = { ...copy[index], photoLink: data.link, uploading: false };
            return { ...prev, compressors: copy };
          });
          toast.success("Photo uploaded");
        } else {
          throw new Error(data.message || "Upload failed");
        }
      } catch (err: any) {
        console.error(err);
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
        const formData = new FormData();
        formData.append("file", file);
    
        const res = await fetch(GAS_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
    
        const data = await res.json();
    
        if (data.status === "success" && data.link) {
          setForm((prev) => ({ ...prev, companyPhotoLink: data.link, companyPhotoUploading: false }));
          toast.success("Company photo uploaded");
          console.log(data.link);
        } else {
          throw new Error(data.message || "Upload failed");
        }
      } catch (err: any) {
        console.error(err);
        setForm((prev) => ({ ...prev, companyPhotoUploading: false, companyPhotoError: err?.message || "Upload error" }));
        toast.error("Company photo upload failed. Please try again.");
      }
    };
    

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      date: form.date,
      customer: form.customer,
      companyPhotoLink: form.companyPhotoLink,
      compressorCount: form.compressorCount,
      compressors: form.compressors,
      submittedAt: new Date().toISOString(),
    };

    try {
      await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Form submitted successfully!");
      setSuccessOpen(true);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_STEP_KEY);
    } catch (e) {
      console.error(e);
      toast.error("Submission failed. Check your Web App URL and try again.");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Helmet>
        <title>Industrial Visit - Compressor Data Collection - Trinity</title>
        <meta name="description" content="Industrial Visit compressor data collection by Trinity. Fast 4-step form with photos, autosave, and mobile-friendly UI." />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">Industrial Visit - Compressor Data Collection - Trinity</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">This form is designed to collect valuable information about compressors in every industry we visit.</p>
            <p className="text-muted-foreground">Your input helps us build a powerful database for competition opportunities, sales tracking, and better customer support.</p>
            <p className="text-muted-foreground">🧭 Every visit counts – your reports directly contribute to our company’s growth and help us serve clients better.</p>
            <p className="text-muted-foreground">✅ Fill this after each industry visit — it only takes 2 minutes!</p>
          </div>
          <div className="relative overflow-hidden rounded-lg border">
            <img
              src="home1.png"
              alt="Industrial visit header reference image showing compressor data collection"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        </header>

        <Progress value={progress} />

        <Card>
          <CardHeader>
            <CardTitle>Step {step} of {MAX_STEPS}</CardTitle>
            <CardDescription>
              {step === 1 && "Select name and date"}
              {step === 2 && "Enter customer information"}
              {step === 3 && "Select number of compressors"}
              {step === 4 && "Enter compressor details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Select Name</Label>
                  <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                    <SelectTrigger id="name" aria-label="Select Name">
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
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" inputMode="numeric" pattern="[0-9]*" value={form.customer.pincode} onChange={(e) => setForm({ ...form, customer: { ...form.customer, pincode: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact person</Label>
                    <Input id="contactPerson" value={form.customer.contactPerson} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactPerson: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact number</Label>
                    <Input id="contactNumber" inputMode="tel" value={form.customer.contactNumber} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactNumber: e.target.value } })} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 items-start">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhoto">Company photo</Label>
                    <Input id="companyPhoto" type="file" accept="image/*" onChange={(e) => handleCompanyPhotoUpload(e.target.files?.[0] || null)} />
                    {form.companyPhotoUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                    {form.companyPhotoLink && (
                      <a className="text-sm text-primary underline" href={form.companyPhotoLink} target="_blank" rel="noreferrer">View uploaded company photo</a>
                    )}
                    {form.companyPhotoError && <p className="text-sm text-destructive">{form.companyPhotoError}</p>}
                  </div>
                  <div className="rounded-md border p-2">
                    <img
                      src="https://drive.google.com/uc?export=view&id=1HaJD8_e6j60vtBZj5BatJOH4oG9F0YDO"
                      alt="Reference company photo example"
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="compressorCount">Number of compressors</Label>
                  <Select value={form.compressorCount} onValueChange={(v) => setForm({ ...form, compressorCount: v })}>
                    <SelectTrigger id="compressorCount" aria-label="Number of compressors">
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
                <p className="text-sm text-muted-foreground self-end">Selecting "More than 10" will redirect you to contact Pradeep.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                {form.compressors.map((comp, idx) => (
                  <div key={idx} className="rounded-md border p-4 space-y-4">
                    <h3 className="text-lg font-semibold">Compressor {idx + 1}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Compressor brand</Label>
                        <Select value={comp.brand} onValueChange={(v) => updateCompressor(idx, { brand: v, ...(v !== "Other" ? { otherBrandName: "" } : {}) })}>
                          <SelectTrigger aria-label="Compressor brand">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRANDS.map((b) => (
                              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {comp.brand === "Other" && (
                          <div className="space-y-2">
                            <Label>Other brand name</Label>
                            <Input placeholder="Enter brand name" value={comp.otherBrandName || ""} onChange={(e) => updateCompressor(idx, { otherBrandName: e.target.value })} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <Select value={comp.size} onValueChange={(v) => updateCompressor(idx, { size: v })}>
                          <SelectTrigger aria-label="Size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {SIZES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year of Manufac.</Label>
                        <Input placeholder="e.g. 2021" value={comp.year} onChange={(e) => updateCompressor(idx, { year: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Running hours</Label>
                        <Input inputMode="numeric" value={comp.runningHours} onChange={(e) => updateCompressor(idx, { runningHours: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Loading hours</Label>
                        <Input inputMode="numeric" value={comp.loadingHours} onChange={(e) => updateCompressor(idx, { loadingHours: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Upload photo (Name plate / display)</Label>
                        <div className="rounded-md border p-2">
                          <img
                            src="https://drive.google.com/uc?export=view&id=1-K1m67afbCa1SQBDtNvM0mUlk_2HRhp_"
                            alt="Reference: nameplate and display photo example"
                            className="w-full h-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                        <Input type="file" accept="image/*" onChange={(e) => handleUpload(idx, e.target.files?.[0] || null)} />
                        {comp.uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                        {comp.photoLink && (
                          <a className="text-sm text-primary underline" href={comp.photoLink} target="_blank" rel="noreferrer">View uploaded photo</a>
                        )}
                        {comp.uploadError && <p className="text-sm text-destructive">{comp.uploadError}</p>}
                      </div>
                    </div>
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
            <AlertDialogDescription>
              Your form has been submitted. Thank you!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setSuccessOpen(false); navigate("/"); }}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function updateCompressor(index: number, patch: Partial<CompressorDetail>) {
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, compressors: copy };
    });
  }
}
