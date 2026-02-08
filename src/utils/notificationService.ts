import { addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../firebase';

// Definindo os tipos permitidos explicitamente
export type NotificationType = 'info' | 'success' | 'warning' | 'alert' | 'mural' | 'agenda' | 'patient';

export const sendNotification = async (
  title: string, 
  message: string, 
  type: NotificationType = 'info'
) => {
  try {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      readBy: [] 
    });
  } catch (error) {
    console.error("Falha ao enviar notificação:", error);
  }
};