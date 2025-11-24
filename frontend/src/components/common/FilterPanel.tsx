import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'number' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: Record<string, string>;
  filterConfigs: FilterConfig[];
  onFilterChange: (key: string, value: string | null) => void;
  onClearFilters: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  filterConfigs,
  onFilterChange,
  onClearFilters,
  className = '',
}) => {
  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key] && !['search', 'page', 'page_size', 'ordering'].includes(key)
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterConfigs.map((config) => (
            <div key={config.key} className="space-y-2">
              <Label htmlFor={config.key}>{config.label}</Label>
            {config.type === 'select' && config.options ? (
              <Select
                value={filters[config.key] || '__ALL__'}
                onValueChange={(value) => onFilterChange(config.key, value === '__ALL__' ? null : value)}
              >
                <SelectTrigger id={config.key}>
                  <SelectValue placeholder={config.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All</SelectItem>
                  {config.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : config.type === 'date' ? (
              <Input
                id={config.key}
                type="date"
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || null)}
                placeholder={config.placeholder}
              />
            ) : config.type === 'number' ? (
              <Input
                id={config.key}
                type="number"
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || null)}
                placeholder={config.placeholder}
                step="0.01"
              />
            ) : (
              <Input
                id={config.key}
                type="text"
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || null)}
                placeholder={config.placeholder}
              />
            )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
