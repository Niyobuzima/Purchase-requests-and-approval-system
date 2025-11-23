import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { handleAndFormatError, ErrorHandlers } from '@/utils/errorHandler';
import { calculateSubtotal, calculateTotal } from '@/utils/calculateSubtotal';
import { purchaseRequestsAPI } from '@/api/purchaseRequests';
import type { RequestItem, CreatePurchaseRequestData } from '@/types';
import { Plus, Trash2, DollarSign } from 'lucide-react';

const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>[]>([
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'unit',
      notes: '',
    },
  ]);
  const [loading, setLoading] = useState(false);

  // Add new item row
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        unit_of_measure: 'unit',
        notes: '',
      },
    ]);
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast({
        title: 'Cannot remove',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Update item field
  const handleItemChange = (
    index: number,
    field: keyof Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>,
    value: string | number
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setItems(updatedItems);
  };

  // Calculate total amount using shared utility
  const getTotalAmount = (): number => {
    return calculateTotal(items);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return false;
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description.trim()) {
        toast({
          title: 'Validation Error',
          description: `Item ${i + 1}: Description is required`,
          variant: 'destructive',
        });
        return false;
      }

      const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
      if (isNaN(qty) || qty <= 0) {
        toast({
          title: 'Validation Error',
          description: `Item ${i + 1}: Quantity must be greater than zero`,
          variant: 'destructive',
        });
        return false;
      }

      const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
      if (isNaN(price) || price <= 0) {
        toast({
          title: 'Validation Error',
          description: `Item ${i + 1}: Unit price must be greater than zero`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        vendor_name: vendorName,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      const response = await purchaseRequestsAPI.create(data);

      toast({
        title: 'Draft saved',
        description: 'Purchase request saved as draft successfully',
      });

      navigate(`/staff/requests/${response.id}`);
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  // Submit for approval
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: CreatePurchaseRequestData = {
        title,
        vendor_name: vendorName,
        description,
        status: 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          unit_of_measure: item.unit_of_measure || 'unit',
          notes: item.notes || '',
        })),
      };

      const response = await purchaseRequestsAPI.create(data);

      // Submit for approval
      await purchaseRequestsAPI.submit(response.id);

      toast({
        title: 'Request submitted',
        description: 'Purchase request submitted for approval successfully',
      });

      navigate('/staff/requests');
    } catch (error) {
      const { toastData } = handleAndFormatError(ErrorHandlers.validation(error));
      toast(toastData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-gray-600 mt-1">Fill in the details for your purchase request</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Provide a title and description for this purchase request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Office Supplies Q1 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor/Supplier Name</Label>
              <Input
                id="vendor_name"
                placeholder="e.g., Acme Office Supplies Inc."
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter the name of the vendor or supplier for this purchase
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>Add items to your purchase request</CardDescription>
              </div>
              <Button onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        onClick={() => handleRemoveItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`description-${index}`}>Description *</Label>
                      <Input
                        id={`description-${index}`}
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`unit-${index}`}>Unit</Label>
                      <Input
                        id={`unit-${index}`}
                        placeholder="unit, kg, box..."
                        value={item.unit_of_measure || ''}
                        onChange={(e) => handleItemChange(index, 'unit_of_measure', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`price-${index}`}>Unit Price *</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-gray-50">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="font-medium">{calculateSubtotal(item).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`notes-${index}`}>Notes</Label>
                      <Textarea
                        id={`notes-${index}`}
                        placeholder="Additional notes for this item..."
                        value={item.notes || ''}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-gray-50">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-gray-600">{items.length} item(s)</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">Total:</span>
                <div className="flex items-center text-2xl font-bold text-green-600">
                  <DollarSign className="h-6 w-6" />
                  {getTotalAmount().toFixed(2)}
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            onClick={() => navigate('/staff/requests')}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex space-x-3">
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRequestPage;
