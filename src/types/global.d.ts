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
    userId: string;
    sessionId: string;
    aiFriend: AiFriend;
    user: User;
    friendsSummary: string;
  }

  interface RouterData {
    user: User;
    activeFriends: AiFriend[];
  }

  interface FriendsInfo {
    user: User;
    friends: AiFriend[];
  }

  interface ModeData {
    mode: "web" | "normal";
    webContent: string;
  }

  interface DataInfo {
    aiFriendId: string;
    aiFriendName: string;
    aiFriendPersona: string;
    aiFriendAbout: string;
    aiFriendKnowledgeBase: string;
    friendsSummary: string;
  }
}

export {};
