declare global {
  interface AiFriend {
    name: string;
    persona?: string;
    about?: string;
    knowledge_base?: string;
  }

  interface User {
    name: string;
    persona?: string;
    about?: string;
    knowledge_base?: string;
  }

  interface DataObject {
    aiFriend: AiFriend;
    user: User;
    friendsSummary: string;
  }
}

export {};
