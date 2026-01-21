'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, Button, Input, Select } from './ui';
import { Service, ServiceFormData } from '@/types';
import { serviceCategories } from '@/lib/mockData';

interface ServiceEditorProps {
  service?: Service | null;
  onBack: () => void;
  onSave: (data: ServiceFormData) => void;
}

export function ServiceEditor({ service, onBack, onSave }: ServiceEditorProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || '',
    category: service?.category || 'Стрижки',
    price: service?.price || 0,
    duration: service?.duration || 60
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});

  const isEditing = !!service;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите название услуги';
    }
    if (!formData.category) {
      newErrors.category = 'Выберите категорию';
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

  const categoryOptions = serviceCategories.map((cat) => ({
    value: cat,
    label: cat
  }));

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
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              error={errors.category}
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

