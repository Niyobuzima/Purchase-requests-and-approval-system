import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { RequestItem } from '@/types';
import { X } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>) => void;
  editItem?: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>;
  editIndex?: number;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  editItem,
  editIndex,
}) => {
  const [formData, setFormData] = useState<Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>>(
    editItem || {
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'unit',
      notes: '',
    }
  );

  React.useEffect(() => {
    if (editItem) {
      setFormData(editItem);
    } else {
      setFormData({
        description: '',
        quantity: 1,
        unit_price: 0,
        unit_of_measure: 'unit',
        notes: '',
      });
    }
  }, [editItem, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'unit',
      notes: '',
    });
    onClose();
  };

  const calculateSubtotal = () => {
    const qty = typeof formData.quantity === 'string' ? parseFloat(formData.quantity) : formData.quantity;
    const price = typeof formData.unit_price === 'string' ? parseFloat(formData.unit_price) : formData.unit_price;
    return (qty * price || 0).toFixed(2);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editIndex !== undefined ? 'Edit Item' : 'Add New Item'}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-description">Description *</Label>
                <Input
                  id="item-description"
                  placeholder="e.g., Printer Paper A4"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-quantity">Quantity *</Label>
                  <Input
                    id="item-quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1"
                    value={formData.quantity}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFormData({ ...formData, quantity: isNaN(value) ? 0 : value });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-unit">Unit of Measure</Label>
                  <Input
                    id="item-unit"
                    placeholder="unit, kg, box..."
                    value={formData.unit_of_measure || ''}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-price">Unit Price *</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFormData({ ...formData, unit_price: isNaN(value) ? 0 : value });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
                    <span className="font-medium text-green-600">${calculateSubtotal()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-notes">Notes</Label>
                <Textarea
                  id="item-notes"
                  placeholder="Additional notes for this item..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editIndex !== undefined ? 'Update Item' : 'Add Item'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
};

export default AddItemModal;
