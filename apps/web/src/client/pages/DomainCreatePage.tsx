import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../components/atoms';
import { useCreateDomain } from '../hooks/useDomains';
import type { CreateDomainInput } from '../types';

export default function DomainCreatePage() {
  const navigate = useNavigate();
  const createDomain = useCreateDomain();

  const [formData, setFormData] = useState<CreateDomainInput>({
    name: '',
    description: '',
    expertise: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateDomainInput, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateDomainInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入领域名称';
    } else if (formData.name.length > 100) {
      newErrors.name = '名称不能超过 100 个字符';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超过 500 个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const domain = await createDomain.mutateAsync(formData);
      navigate(`/domains/${domain.id}`);
    } catch (error) {
      console.error('创建领域失败:', error);
    }
  };

  const handleChange = (field: keyof CreateDomainInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          to="/domains"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回列表
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创建新领域</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="领域名称"
              placeholder="例如：产品文档助手"
              value={formData.name}
              onChange={handleChange('name')}
              error={errors.name}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                className={`
                  w-full px-3 py-2
                  border rounded-lg
                  text-gray-900 placeholder-gray-400
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-0
                  ${
                    errors.description
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }
                `}
                rows={3}
                placeholder="描述这个领域的用途..."
                value={formData.description || ''}
                onChange={handleChange('description')}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <Input
              label="专业领域"
              placeholder="例如：技术文档、客户支持"
              value={formData.expertise || ''}
              onChange={handleChange('expertise')}
              helperText="指定 AI 助手的专业方向"
            />

            {createDomain.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  创建失败: {(createDomain.error as Error).message}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Link to="/domains">
                <Button type="button" variant="secondary">
                  取消
                </Button>
              </Link>
              <Button type="submit" isLoading={createDomain.isPending}>
                创建领域
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
