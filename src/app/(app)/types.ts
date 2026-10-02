export type EmailOption = {
  id: string;
  label: string;
  address: string;
  color: string;
};

export type AppRow = {
  id: string;
  emailId: string;
  name: string;
  url: string | null;
  category: string | null;
  notes: string | null;
  signupDate: string | null;
  favicon: string | null;
  createdAt: string;
};
