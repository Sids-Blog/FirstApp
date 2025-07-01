import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/lib/data-context";
import { Briefcase, CreditCard, Plus, Tag, Trash2, Pencil, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { useTransactions } from "@/lib/transaction-context";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggableItem({ id, label, children }: { id: string, label: React.ReactNode, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: isDragging ? '#f3f4f6' : undefined,
    borderRadius: 6,
    padding: '0.25rem 0.5rem',
  };
  return (
    <span ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} className="cursor-grab pr-1 text-gray-400 hover:text-gray-600"><GripVertical className="h-3 w-3" /></span>
      {label}
      {children}
    </span>
  );
}

const DropdownManager = () => {
  const {
    expenseCategories,
    paymentMethods,
    incomeCategories,
    addExpenseCategory,
    removeExpenseCategory,
    addPaymentMethod,
    removePaymentMethod,
    addIncomeCategory,
    removeIncomeCategory,
    updateCategoryOrder,
    updatePaymentMethodOrder
  } = useData();
  const { bulkRenameInTransactions } = useTransactions();

  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newIncomeSource, setNewIncomeSource] = useState("");
  const [editing, setEditing] = useState<{ type: 'expense' | 'payment' | 'income', oldValue: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expenseOrder, setExpenseOrder] = useState<string[]>([]);
  const [paymentOrder, setPaymentOrder] = useState<string[]>([]);
  const [incomeOrder, setIncomeOrder] = useState<string[]>([]);

  // Sync order with data
  useEffect(() => {
    setExpenseOrder(expenseCategories);
  }, [expenseCategories]);
  useEffect(() => {
    setPaymentOrder(paymentMethods);
  }, [paymentMethods]);
  useEffect(() => {
    setIncomeOrder(incomeCategories);
  }, [incomeCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const moveItem = (arr: string[], from: number, to: number) => {
    const copy = [...arr];
    const item = copy.splice(from, 1)[0];
    copy.splice(to, 0, item);
    return copy;
  };

  const handleDelete = async (type: 'expense' | 'payment' | 'income', value: string) => {
    if (!window.confirm(`Are you sure you want to delete '${value}'? This cannot be undone.`)) return;
    const depricatedValue = value + ' [Depricated]';
    if (type === 'expense') {
      await bulkRenameInTransactions('category', value, depricatedValue);
      removeExpenseCategory(value);
    }
    if (type === 'payment') {
      await bulkRenameInTransactions('payment_method', value, depricatedValue);
      removePaymentMethod(value);
    }
    if (type === 'income') {
      await bulkRenameInTransactions('category', value, depricatedValue);
      removeIncomeCategory(value);
    }
  };

  const handleAddExpenseCategory = () => {
    addExpenseCategory(newCategory);
    setNewCategory("");
  };

  const handleAddPaymentMethod = () => {
    addPaymentMethod(newPaymentMethod);
    setNewPaymentMethod("");
  };

  const handleAddIncomeSource = () => {
    addIncomeCategory(newIncomeSource);
    setNewIncomeSource("");
  };

  const handleEdit = (type: 'expense' | 'payment' | 'income', oldValue: string) => {
    setEditing({ type, oldValue });
    setEditValue(oldValue);
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (editValue.trim() === "" || editValue === editing.oldValue) {
      setEditing(null);
      return;
    }
    if (editing.type === 'expense') {
      await bulkRenameInTransactions('category', editing.oldValue, editValue);
      removeExpenseCategory(editing.oldValue);
      addExpenseCategory(editValue);
    } else if (editing.type === 'payment') {
      await bulkRenameInTransactions('payment_method', editing.oldValue, editValue);
      removePaymentMethod(editing.oldValue);
      addPaymentMethod(editValue);
    } else if (editing.type === 'income') {
      await bulkRenameInTransactions('category', editing.oldValue, editValue);
      removeIncomeCategory(editing.oldValue);
      addIncomeCategory(editValue);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories & Options</CardTitle>
          <CardDescription>
            Add or remove categories and options for your expense and income forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expense-categories" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense-categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Expense Categories
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </TabsTrigger>
              <TabsTrigger value="income-sources" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Income Sources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense-categories" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new expense category..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                />
                <Button onClick={handleAddExpenseCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => {
                const { active, over } = e;
                if (typeof active.id === 'string' && typeof over?.id === 'string' && active.id !== over.id) {
                  const oldIndex = expenseOrder.indexOf(String(active.id));
                  const newIndex = expenseOrder.indexOf(String(over.id));
                  const newOrder = arrayMove(expenseOrder, oldIndex, newIndex);
                  setExpenseOrder(newOrder);
                  updateCategoryOrder('expense', newOrder);
                }
              }}>
                <SortableContext items={expenseOrder} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {expenseOrder.map((category) => (
                      <DraggableItem key={category} id={category} label={category}>
                        {editing && editing.type === 'expense' && editing.oldValue === category ? (
                          <>
                            <Input size="sm" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 inline-block" />
                            <Button size="sm" onClick={handleEditSave} className="ml-1">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1">Cancel</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit('expense', category)} className="text-blue-500 hover:text-blue-700"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => handleDelete('expense', category)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                      </DraggableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="payment-methods" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new payment method..."
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPaymentMethod()}
                />
                <Button onClick={handleAddPaymentMethod}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => {
                const { active, over } = e;
                if (typeof active.id === 'string' && typeof over?.id === 'string' && active.id !== over.id) {
                  const oldIndex = paymentOrder.indexOf(String(active.id));
                  const newIndex = paymentOrder.indexOf(String(over.id));
                  const newOrder = arrayMove(paymentOrder, oldIndex, newIndex);
                  setPaymentOrder(newOrder);
                  updatePaymentMethodOrder(newOrder);
                }
              }}>
                <SortableContext items={paymentOrder} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {paymentOrder.map((method) => (
                      <DraggableItem key={method} id={method} label={method}>
                        {editing && editing.type === 'payment' && editing.oldValue === method ? (
                          <>
                            <Input size="sm" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 inline-block" />
                            <Button size="sm" onClick={handleEditSave} className="ml-1">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1">Cancel</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit('payment', method)} className="text-blue-500 hover:text-blue-700"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => handleDelete('payment', method)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                      </DraggableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="income-sources" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new income source..."
                  value={newIncomeSource}
                  onChange={(e) => setNewIncomeSource(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIncomeSource()}
                />
                <Button onClick={handleAddIncomeSource}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => {
                const { active, over } = e;
                if (typeof active.id === 'string' && typeof over?.id === 'string' && active.id !== over.id) {
                  const oldIndex = incomeOrder.indexOf(String(active.id));
                  const newIndex = incomeOrder.indexOf(String(over.id));
                  const newOrder = arrayMove(incomeOrder, oldIndex, newIndex);
                  setIncomeOrder(newOrder);
                  updateCategoryOrder('income', newOrder);
                }
              }}>
                <SortableContext items={incomeOrder} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {incomeOrder.map((source) => (
                      <DraggableItem key={source} id={source} label={source}>
                        {editing && editing.type === 'income' && editing.oldValue === source ? (
                          <>
                            <Input size="sm" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 inline-block" />
                            <Button size="sm" onClick={handleEditSave} className="ml-1">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="ml-1">Cancel</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit('income', source)} className="text-blue-500 hover:text-blue-700"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => handleDelete('income', source)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                      </DraggableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DropdownManager;
