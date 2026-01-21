'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Input, Select } from './ui';
import { Service } from '@/types';
import { getCategories, CategoryData } from '@/lib/api-client';

interface ServiceFormData {
  name: string;
  categoryId: number;
  price: number;
  duration: number;
}

interface ServiceEditorProps {
  service?: Service | null;
  onBack: () => void;
  onSave: (data: ServiceFormData) => void;
}

export function ServiceEditor({ service, onBack, onSave }: ServiceEditorProps) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || '',
    categoryId: 0,
    price: service?.price || 0,
    duration: service?.duration || 60
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});

  const isEditing = !!service;

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        const categoriesData = result.data;
        setCategories(categoriesData);
        
        // If editing, find category by name and set categoryId
        if (service?.category) {
          const cat = categoriesData.find(c => c.name === service.category);
          if (cat) {
            setFormData(prev => ({ ...prev, categoryId: cat.id }));
          }
        } else if (categoriesData.length > 0) {
          // Set first category as default for new service
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите название услуги';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Выберите категорию';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Введите корректную цену';
    }
    if (formData.duration <= 0) {
      newErrors.duration = 'Введите корректную длительность';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name
  }));

  if (isLoadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Назад</span>
      </button>

      <Card>
        <CardContent>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {isEditing ? 'Редактировать услугу' : 'Новая услуга'}
          </h2>
          <p className="text-gray-500 mb-6">
            Заполните информацию об услуге
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Название услуги"
              placeholder="Например: Женская стрижка"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
            />

            <Select
              label="Категория"
              options={categoryOptions}
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              error={errors.categoryId}
              placeholder="Выберите категорию"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Цена (₽)"
                type="number"
                placeholder="2500"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                error={errors.price}
              />

              <Input
                label="Длительность (мин)"
                type="number"
                placeholder="60"
                value={formData.duration || ''}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                error={errors.duration}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="flex-1"
              >
                Сохранить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
