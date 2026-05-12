export class PickOption {
  id: string;
  label: string;
  votes: number;
}

export class Pick {
  id: string;
  title: string;
  description?: string;
  options: PickOption[];
  createdAt: Date;
}
