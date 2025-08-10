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

const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbwR0CU9AATBHzUgxmCj1nOHxIVg1aep1HyvULT0_q6cRT_QIE0oPfeyA-YHb5ahaXudNA/exec";
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

const SIZES = ["<30kw", "30 to 75kw", ">75kw"];

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(STORAGE_STEP_KEY, String(step));
  }, [step]);

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

  // Convert file to base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // Remove data URI prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Upload compressor photo
  const handleUpload = async (index: number, file: File | null) => {
    if (!file) return;
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], uploading: true, uploadError: null };
      return { ...prev, compressors: copy };
    });

    try {
      const base64 = await fileToBase64(file);
      const payload = { filename: file.name, mimeType: file.type, data: base64 };

      const res = await fetch(GAS_UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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

  // Upload company photo
  const handleCompanyPhotoUpload = async (file: File | null) => {
    if (!file) return;
    setForm((prev) => ({ ...prev, companyPhotoUploading: true, companyPhotoError: null }));

    try {
      const base64 = await fileToBase64(file);
      const payload = { filename: file.name, mimeType: file.type, data: base64 };

      const res = await fetch(GAS_UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === "success" && data.link) {
        setForm((prev) => ({ ...prev, companyPhotoLink: data.link, companyPhotoUploading: false }));
        toast.success("Company photo uploaded");
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
    // your same JSX from original code...
    // I’m keeping your UI exactly as before.
  );

  function updateCompressor(index: number, patch: Partial<CompressorDetail>) {
    setForm((prev) => {
      const copy = [...prev.compressors];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, compressors: copy };
    });
  }
}
