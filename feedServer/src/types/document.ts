export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'text';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
} 