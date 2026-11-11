import { db } from './index.ts';
import { users, diagnosticRecords, chatMessages } from './schema.ts';
import { eq, desc, asc, and } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateUser query:', error);
    throw new Error('Failed to register or update user', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}

export async function saveDiagnosticRecord(data: {
  userId: number;
  patientId: string;
  caseTitle: string;
  predictedClass: string;
  probabilityPercent: string;
  backbone: string;
  raleScore: number;
  triagePriority: string;
  radiologistImpression?: string;
  clinicalNotes?: string;
}) {
  try {
    const result = await db.insert(diagnosticRecords)
      .values(data)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error saving diagnostic record:', error);
    throw new Error('Failed to save diagnostic record', { cause: error });
  }
}

export async function getDiagnosticRecords(userId: number) {
  try {
    return await db.select()
      .from(diagnosticRecords)
      .where(eq(diagnosticRecords.userId, userId))
      .orderBy(desc(diagnosticRecords.createdAt))
      .limit(50);
  } catch (error) {
    console.error('Error getting diagnostic records:', error);
    throw new Error('Failed to fetch diagnostic records', { cause: error });
  }
}

export async function saveChatMessage(data: {
  userId: number;
  role: 'user' | 'model' | 'system';
  content: string;
  model: string;
  radiologistPersona: string;
  caseContextId?: string;
}) {
  try {
    const result = await db.insert(chatMessages)
      .values(data)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw new Error('Failed to save chat message', { cause: error });
  }
}

export async function getChatHistory(userId: number, caseContextId?: string) {
  try {
    if (caseContextId) {
      return await db.select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.caseContextId, caseContextId)
          )
        )
        .orderBy(asc(chatMessages.createdAt));
    }

    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(100);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw new Error('Failed to fetch chat history', { cause: error });
  }
}
