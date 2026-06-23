import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getTags(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener etiquetas' });
  }
}

export async function createTag(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre de la etiqueta es requerido' });
  }

  const cleanName = name.trim().toLowerCase();

  try {
    const existing = await prisma.tag.findFirst({
      where: { name: cleanName, userId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una etiqueta con este nombre' });
    }

    const tag = await prisma.tag.create({
      data: {
        name: cleanName,
        userId,
      },
    });
    res.status(201).json(tag);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la etiqueta' });
  }
}

export async function deleteTag(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const tag = await prisma.tag.findFirst({
      where: { id, userId },
    });
    if (!tag) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    await prisma.tag.delete({
      where: { id },
    });

    res.json({ message: 'Etiqueta eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la etiqueta' });
  }
}
