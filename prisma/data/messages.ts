export const threads = [
  { id: "thread_1", customerId: "cust_1" },
  { id: "thread_2", customerId: "cust_2" },
  { id: "thread_3", customerId: "cust_3" },
  { id: "thread_4", customerId: "cust_4" }
];

export const messages = [
  { 
    id: "msg_1", 
    threadId: "thread_1", 
    sender: "CUSTOMER", 
    content: "Hi, I received my order yesterday but the shirt is too small. Can I return it?" 
  },
  { 
    id: "msg_2", 
    threadId: "thread_2", 
    sender: "CUSTOMER", 
    content: "Hello, I bought a lamp from you over a month ago but just opened it and it doesn't fit my room. I'd like a refund." 
  },
  { 
    id: "msg_3", 
    threadId: "thread_3", 
    sender: "CUSTOMER", 
    content: "CANCEL MY ORDER IMMEDIATELY. IF THIS SHIPS I AM CALLING MY LAWYER. I SPENT $800 AND FOUND IT CHEAPER ELSEWHERE!" 
  },
  { 
    id: "msg_4", 
    threadId: "thread_4", 
    sender: "CUSTOMER", 
    content: "Hey, my tracking says it shipped a week ago but it hasn't updated since. Where is my stuff?" 
  }
];
