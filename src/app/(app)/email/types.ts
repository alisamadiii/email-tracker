export type EmailOption = {
  id: string;
  label: string;
  address: string;
  color: string;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type AppRow = {
  id: string;
  emailId: string;
  name: string;
  url: string | null;
  categoryId: string | null;
  notes: string | null;
  favicon: string | null;
  createdAt: string;
};
