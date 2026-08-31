import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getCategories(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener categorías' });
  }
}

export async function createCategory(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { name, color, type } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
  }

  const categoryType = type || 'expense';
  if (categoryType !== 'expense' && categoryType !== 'income') {
    return res.status(400).json({ error: 'El tipo de categoría debe ser expense o income' });
  }

  try {
    const existing = await prisma.category.findFirst({
      where: { name, type: categoryType, userId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre para este tipo' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        color: color || '#3B82F6',
        type: categoryType,
        userId,
      },
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la categoría' });
  }
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    const category = await prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    if (name && name !== category.name) {
      const existing = await prisma.category.findFirst({
        where: { name, type: category.type, userId, id: { not: id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Ya existe otra categoría con este nombre para este tipo' });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name || category.name,
        color: color || category.color,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la categoría' });
  }
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const category = await prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Check if there are expenses using this category
    const expenseCount = await prisma.expense.count({
      where: { categoryId: id, userId },
    });

    // Check if there are incomes using this category
    const incomeCount = await prisma.income.count({
      where: { categoryId: id, userId },
    });

    if (expenseCount > 0 || incomeCount > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar la categoría porque tiene movimientos asociados. Reasigna los gastos o ingresos a otra categoría antes de borrarla.',
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la categoría' });
  }
}
