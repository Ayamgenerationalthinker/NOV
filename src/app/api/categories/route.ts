import { NextResponse } from 'next/server';
import { CategoryService } from '@/services/category/category.service';

export async function GET() {
  try {
    const categories = await CategoryService.getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
