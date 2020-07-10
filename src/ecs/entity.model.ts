export interface Entity {
  id: number;
}

export interface EntityEntry {
  id: number;
  components: ComponentEntry[];
}

export interface ComponentEntry {
  typeStr: string;
  index: number;
}
