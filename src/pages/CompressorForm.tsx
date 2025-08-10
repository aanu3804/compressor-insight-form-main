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
  remarks : string,
  photoLinks?: string[];
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
  companyPhotoLinks?: string[];
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
    { brand: "", otherBrandName: "", size: "", year: "", runningHours: "", loadingHours: "", photoLink: "", remarks: "" },
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
          next.push({ brand: "", size: "", year: "", runningHours: "", loadingHours: "", photoLink: "", remarks: "" });
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

    const res = await fetch("/api/upload", {
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
        copy[index] = { ...copy[index], photoLinks: [...(prev.compressors[index].photoLinks || []), link], uploading: false };
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
    try {
      // Prepare data for Google Sheets
      const submissionData = {
        name: form.name,
        date: form.date,
        customer: form.customer,
        companyPhotoLink: form.companyPhotoLink,
        compressorCount: form.compressorCount,
        compressors: form.compressors
      };

      // Submit through API proxy (like photo upload)
      const response = await fetch("/api/submit", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        toast.success("Form submitted successfully!");
        setSuccessOpen(true);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_STEP_KEY);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error("Form submission failed. Please try again.");
    }
  };

  function updateCompressor(index: number, patch: Partial<CompressorDetail>) {
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, compressors: copy };
    });
  }

  return (
    <div className="relative min-h-screen">
      {/* Blurred Background Layer */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url("step1.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          filter: 'blur(3px)'
        }}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 container mx-auto py-10">
        <Helmet>
          <title>Industrial Visit - Compressor Data Collection - Trinity</title>
        </Helmet>

                <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-block p-4 bg-white/95 border-4 border-white rounded-lg shadow-lg mb-4">
              <h1 className="text-2xl font-bold text-black">
                Industrial Visit - Compressor Data Collection - Trinity
              </h1>
            </div>
            <Progress value={progress} />
          </div>

          <Card className="p-6">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl">
                {step === 2 && "Company details"}
                {step === 4 && "Compressor(s) details"}
                {step !== 2 && step !== 4 && `Step ${step} of ${MAX_STEPS}`}
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Industrial Visit - Compressor Data Collection - Trinity
                  </h1>
                  <div className="max-w-2xl mx-auto text-gray-600 space-y-3">
                    <p>
                      This form is designed to collect valuable information about compressors in every industry we visit.
                      Your input helps us build a powerful database for competition opportunities, sales tracking, and better customer support.
                    </p>
                    <p className="flex items-center gap-2 text-blue-600 font-medium">
                      🧭
                      Every visit counts – your reports directly contribute to our company's growth and help us serve clients better.
                    </p>
                    <p className="flex items-center gap-2 text-green-600 font-medium">
                      <span>✅</span>
                      Fill this after each industry visit — it only takes 2 minutes!
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
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
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" value={form.customer.pincode} onChange={(e) => setForm({ ...form, customer: { ...form.customer, pincode: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" value={form.customer.contactPerson} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactPerson: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" value={form.customer.contactNumber} onChange={(e) => setForm({ ...form, customer: { ...form.customer, contactNumber: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhoto">Company Photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input 
                        id="companyPhoto" 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleCompanyPhotoUpload(e.target.files?.[0] || null)} 
                        disabled={form.companyPhotoUploading}
                      />
                    </div>
                    <div className="w-80 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <img 
                        src="companyimg.jpg" 
                        alt="Reference" 
                        className="w-76 h-44 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  {form.companyPhotoUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Uploading...</span>
                        <span>Please wait</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  )}
                  {form.companyPhotoError && (
                    <p className="text-red-600 text-sm">{form.companyPhotoError}</p>
                  )}
                  {form.companyPhotoLink && (
                    <div className="flex items-center gap-4">
                      <a href={form.companyPhotoLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View uploaded company photo
                      </a>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, companyPhotoLink: "" }))}
                        className="text-red-600 hover:text-red-800 hover:underline text-sm"
                      >
                        Remove photo
                      </button>
                    </div>
                  )}
                </div>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor={`brand-${idx}`}>Brand</Label>
                      <Select value={comp.brand} onValueChange={(v) => updateCompressor(idx, { brand: v, ...(v !== "Other" ? { otherBrandName: "" } : {}) })}>
                        <SelectTrigger id={`brand-${idx}`}><SelectValue placeholder="Select brand" /></SelectTrigger>
                        <SelectContent>
                          {BRANDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {comp.brand === "Other" && (
                      <div className="space-y-2">
                        <Label htmlFor={`otherBrand-${idx}`}>Other Brand Name</Label>
                        <Input 
                          id={`otherBrand-${idx}`}
                          value={comp.otherBrandName || ""} 
                          onChange={(e) => updateCompressor(idx, { otherBrandName: e.target.value })} 
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor={`size-${idx}`}>Size</Label>
                      <Select value={comp.size} onValueChange={(v) => updateCompressor(idx, { size: v })}>
                        <SelectTrigger id={`size-${idx}`}><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`year-${idx}`}>Year</Label>
                      <Input 
                        id={`year-${idx}`}
                        value={comp.year} 
                        onChange={(e) => updateCompressor(idx, { year: e.target.value })} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`runningHours-${idx}`}>Running Hours</Label>
                      <Input 
                        id={`runningHours-${idx}`}
                        value={comp.runningHours} 
                        onChange={(e) => updateCompressor(idx, { runningHours: e.target.value })} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`loadingHours-${idx}`}>Loading Hours</Label>
                      <Input 
                        id={`loadingHours-${idx}`}
                        value={comp.loadingHours} 
                        onChange={(e) => updateCompressor(idx, { loadingHours: e.target.value })} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`remarks-${idx}`}>Remarks</Label>
                      <Input 
                        id={`remarks-${idx}`}
                        value={comp.remarks} 
                        onChange={(e) => updateCompressor(idx, { remarks: e.target.value })} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`photo-${idx}`}>Compressor Photo</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input 
                            id={`photo-${idx}`}
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleUpload(idx, e.target.files?.[0] || null)} 
                            disabled={comp.uploading}
                          />
                        </div>
                        <div className="w-80 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <img 
                            src="compressor.png" 
                            alt="Reference" 
                            className="w-76 h-44 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                      {comp.uploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Uploading...</span>
                            <span>Please wait</span>
                          </div>
                          <Progress value={100} className="h-2" />
                        </div>
                      )}
                      {comp.uploadError && (
                        <p className="text-red-600 text-sm">{comp.uploadError}</p>
                      )}
                      {comp.photoLink && (
                        <div className="flex items-center gap-4">
                          <a href={comp.photoLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            View uploaded photo
                          </a>
                          <button
                            type="button"
                            onClick={() => updateCompressor(idx, { photoLink: "" })}
                            className="text-red-600 hover:text-red-800 hover:underline text-sm"
                          >
                            Remove photo
                          </button>
                        </div>
                      )}
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
            <AlertDialogDescription>Your form has been submitted. Thank you!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setSuccessOpen(false); navigate("/"); }}>Close</AlertDialogAction>
          </AlertDialogFooter>
                 </AlertDialogContent>
       </AlertDialog>
       </div>
     </div>
   );
 }
