import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/data-context';
import { useTransactions } from '@/lib/transaction-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, GripVertical, TrendingUp, TrendingDown, Wallet, Plus, BarChart3, Tag, List as ListIcon, PieChart as PieChartIcon, Trophy, AlertTriangle, Lock, Filter as FilterIcon, ChevronUp, ChevronDown, ChevronsUpDown, Banknote, HandCoins, PiggyBank, SquarePen, Trash, Home, LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format, parse } from 'date-fns';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Add at the top, after imports:
interface BudgetTransaction {
  id: string;
  date: string;
  month: string; // e.g., '2024-06'
  category: string;
  amount: number;
  comment: string;
}

// Placeholder for budget data (should be replaced with real logic/storage)
interface BudgetEntry {
  date: string;
  categoryAmounts: Record<string, number>;
  comment: string;
}

// Add a new type for spend transactions
interface SpendTransaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  comment: string;
  month: string; // Added month field
}

// --- DraggableItem (copied from DropdownManager for local use) ---
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
    minHeight: '2rem',
    touchAction: 'none',
  };
  return (
    <span ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} className="cursor-grab pr-1 text-gray-400 hover:text-gray-600 touch-manipulation p-1 -m-1 rounded">
        <GripVertical className="h-4 w-4 sm:h-3 sm:w-3" />
      </span>
      {label}
      {children}
    </span>
  );
}

// --- Budget Category Management ---
interface BudgetCategory {
  id: string;
  name: string;
  parent_id: string | null;
  defaultValue: number;
}

interface BudgetTag {
  id: string;
  name: string;
  order?: number;
}

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

const BudgetPage: React.FC = () => {
  const { expenseCategories, incomeCategories } = useData();
  const { transactions } = useTransactions();
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Budget-specific categories (local state, not shared)
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [budgetTags, setBudgetTags] = useState<BudgetTag[]>([]);
  const [newBudgetTag, setNewBudgetTag] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagValue, setEditTagValue] = useState('');

  const [newBudgetCategoryTag, setNewBudgetCategoryTag] = useState<string>('');
  const [editingCategoryTag, setEditingCategoryTag] = useState<string>('');
  const [newBudgetCategoryDefault, setNewBudgetCategoryDefault] = useState<string>('');
  const [editingCategoryDefault, setEditingCategoryDefault] = useState<string>('');

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tags, categories, and transactions from Supabase on load and after any change
  const fetchAllData = async () => {
    const { data: tags, error: tagError } = await supabase
      .from('categoriesbudget')
      .select('*')
      .is('parent_id', null)
      .order('order', { ascending: true });
    const tagsTyped: BudgetTag[] = tags as BudgetTag[];
    // Ensure NoTag exists
    let noTag = tagsTyped.find(t => t.name === 'NoTag');
    if (!noTag) {
      const { data: inserted, error: insertError } = await supabase.from('categoriesbudget').insert([
        { name: 'NoTag', parent_id: null, default_value: 0 }
      ]).select();
      if (!insertError && inserted && inserted.length > 0) {
        noTag = inserted[0];
        tagsTyped.unshift(noTag);
      }
    }
    const { data: categories, error: catError } = await supabase
      .from('categoriesbudget')
      .select('*')
      .not('parent_id', 'is', null)
      .order('order', { ascending: true });
    const { data: transactions, error: txError } = await supabase
      .from('transactionsbudget')
      .select('*');
    if (!tagError && tagsTyped) setBudgetTags(tagsTyped);
    if (!catError && categories) {
      // Map default_value from DB to defaultValue in BudgetCategory
      setBudgetCategories(categories.map(cat => ({
        ...cat,
        defaultValue: cat.default_value
      })));
    }
    if (!txError && transactions) {
      setBudgetTransactions(transactions.filter(tx => tx.type === 'budget'));
      setSpendTransactions(transactions.filter(tx => tx.type === 'spend'));
    }
  };
  useEffect(() => { fetchAllData(); }, []);

  // Add new tag
  const handleAddBudgetTag = async () => {
    if (!newBudgetTag.trim()) return;
    const maxOrder = budgetTags.length > 0 ? Math.max(...budgetTags.map(t => t.order ?? 0)) : 0;
    const { error } = await supabase.from('categoriesbudget').insert([
      { name: newBudgetTag.trim(), parent_id: null, default_value: 0, order: maxOrder + 1 }
    ]);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tag: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    setNewBudgetTag('');
    toast({
      title: 'Tag Added',
      description: 'Successfully added new tag.',
    });
  };

  // Edit tag
  const handleSaveEditTag = async () => {
    if (!editingTag) return;
    const oldTag = budgetTags.find(t => t.id === editingTag)?.name;
    const newTagName = editTagValue.trim();
    const { error } = await supabase.from('categoriesbudget').update({ name: newTagName }).eq('id', editingTag);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit tag: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    // Update all categories with this tag (parent_id == editingTag)
    const { data: affectedCategories } = await supabase.from('categoriesbudget').select('id, name').eq('parent_id', editingTag);
    if (affectedCategories && oldTag && oldTag !== newTagName) {
      for (const cat of affectedCategories) {
        // Update all transactions for this category (by category name)
        await supabase.from('transactionsbudget').update({ category: cat.name }).eq('category', oldTag);
      }
    }
    await fetchAllData();
    setEditingTag(null);
    setEditTagValue('');
    toast({
      title: 'Tag Updated',
      description: 'Successfully updated tag.',
    });
  };

  // Delete tag
  const handleRemoveBudgetTag = async (id: string) => {
    const tag = budgetTags.find(t => t.id === id);
    if (!tag) return;
    if (tag.name === 'NoTag') {
      toast({
        title: 'Cannot Delete',
        description: 'The "NoTag" category cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the tag '${tag.name}'? This cannot be undone. All categories with this tag will be untagged.`)) return;
    const { error } = await supabase.from('categoriesbudget').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tag: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    toast({
      title: 'Tag Deleted',
      description: 'Successfully deleted tag.',
    });
  };

  // Add new category
  const handleAddBudgetCategory = async () => {
    if (!newBudgetCategory.trim()) return;
    const { error } = await supabase.from('categoriesbudget').insert([
      {
        name: newBudgetCategory.trim(),
        parent_id: newBudgetCategoryTag || null,
        default_value: parseFloat(newBudgetCategoryDefault) || 0
      }
    ]);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add category: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    setNewBudgetCategory('');
    setNewBudgetCategoryTag('');
    setNewBudgetCategoryDefault('');
    toast({
      title: 'Category Added',
      description: 'Successfully added new category.',
    });
  };

  // Edit category
  const handleSaveEditCategory = async () => {
    if (!editingCategory) return;
    const oldCategory = budgetCategories.find(c => c.id === editingCategory)?.name;
    const newCategoryName = editValue.trim();
    const { error } = await supabase.from('categoriesbudget').update({
      name: newCategoryName,
      parent_id: editingCategoryTag || null,
      default_value: parseFloat(editingCategoryDefault) || 0
    }).eq('id', editingCategory);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit category: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    // Update all transactions with the old category name
    if (oldCategory && oldCategory !== newCategoryName) {
      await supabase.from('transactionsbudget').update({ category: newCategoryName }).eq('category', oldCategory);
    }
    await fetchAllData();
    setEditingCategory(null);
    setEditValue('');
    setEditingCategoryTag('');
    setEditingCategoryDefault('');
    toast({
      title: 'Category Updated',
      description: 'Successfully updated category.',
    });
  };

  // Delete category
  const handleRemoveBudgetCategory = async (id: string) => {
    const cat = budgetCategories.find(c => c.id === id);
    if (!cat) return;
    if (!window.confirm(`Are you sure you want to delete the category '${cat.name}'? This cannot be undone.`)) return;
    const { error } = await supabase.from('categoriesbudget').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    toast({
      title: 'Category Deleted',
      description: 'Successfully deleted category.',
    });
  };

  // Drag-and-drop reorder
  const handleDragEnd = (e: any) => {
    const { active, over } = e;
    if (active.id !== over?.id) {
      const oldIndex = budgetCategories.findIndex(cat => cat.id === active.id);
      const newIndex = budgetCategories.findIndex(cat => cat.id === over.id);
      setBudgetCategories(arrayMove(budgetCategories, oldIndex, newIndex));
    }
  };

  // State for modals/forms
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showSpendBudget, setShowSpendBudget] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Add Budget form state
  const [budgetTransactions, setBudgetTransactions] = useState<BudgetTransaction[]>([]);
  const [budgetDate, setBudgetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [budgetMonth, setBudgetMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, number>>(() => Object.fromEntries(budgetCategories.map(cat => [cat.name, 0])));
  const [budgetComment, setBudgetComment] = useState('');

  // Spend Budget form state
  const [spendDate, setSpendDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [spendCategory, setSpendCategory] = useState(budgetCategories[0]?.name || '');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendComment, setSpendComment] = useState('');
  const [spendMonth, setSpendMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Placeholder: budgets per category (should be loaded from backend)
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);

  // Use budgetCategories instead of allCategories for budget logic
  const allCategories = budgetCategories.map(cat => cat.name);

  // Calculate total budget per category (sum of all budget transactions for that category)
  const totalBudgetPerCategory: Record<string, number> = {};
  allCategories.forEach(cat => {
    totalBudgetPerCategory[cat] = budgetTransactions
      .filter(tx => tx.category === cat)
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  // Add a new type for spend transactions
  const [spendTransactions, setSpendTransactions] = useState<SpendTransaction[]>([]);

  // Add Budget transaction
  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMonth = budgetMonth;
    const newRecords = budgetCategories
      .filter(cat => budgetAmounts[cat.name] && budgetAmounts[cat.name] > 0)
      .map(cat => ({
        date: budgetDate,
        month: currentMonth,
        category_id: cat.id,
        category: cat.name, // Store category name as well
        amount: budgetAmounts[cat.name],
        comment: budgetComment,
        type: 'budget'
      }));
    if (newRecords.length > 0) {
      const { error } = await supabase.from('transactionsbudget').insert(newRecords);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add budget transaction: ' + error.message,
          variant: 'destructive',
        });
        return;
      }
      await fetchAllData();
    }
    setShowAddBudget(false);
    setBudgetComment('');
    setBudgetAmounts(Object.fromEntries(budgetCategories.map(cat => [cat.name, 0])));
    setBudgetDate(new Date().toISOString().slice(0, 10));
    toast({
      title: 'Budget Added',
      description: 'Successfully added budget transaction.',
    });
  };

  // Add Spend transaction
  const handleSpendBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = budgetCategories.find(c => c.name === spendCategory);
    if (!cat) return;
    const newRecord = {
      date: spendDate,
      month: spendMonth,
      category_id: cat.id,
      category: cat.name, // Store category name as well
      amount: parseFloat(spendAmount),
      comment: spendComment,
      type: 'spend'
    };
    const { error } = await supabase.from('transactionsbudget').insert([newRecord]);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add spend transaction: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    setShowSpendBudget(false);
    setSpendComment('');
    setSpendAmount('');
    setSpendMonth(format(new Date(), 'yyyy-MM'));
    toast({
      title: 'Spend Added',
      description: 'Successfully added spend transaction.',
    });
  };

  // Calculate available balance per category (total budget - total spend)
  const availableBalances: Record<string, number> = {};
  allCategories.forEach(cat => {
    const spent = spendTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
    availableBalances[cat] = totalBudgetPerCategory[cat] - spent;
  });

  // Handlers
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Calculate total budget and available balance per tag
  const tagTotals = budgetTags.map(tag => {
    const tagCategories = budgetCategories.filter(cat => cat.parent_id === tag.id);
    const totalBudget = tagCategories.reduce((sum, cat) => sum + (totalBudgetPerCategory[cat.name] || 0), 0);
    const available = tagCategories.reduce((sum, cat) => sum + (availableBalances[cat.name] || 0), 0);
    return { tag, totalBudget, available };
  });

  const [monthView, setMonthView] = useState(format(new Date(), 'yyyy-MM'));

  // Filtered transactions for selected month
  const monthBudgetTx = budgetTransactions.filter(tx => tx.month === monthView);
  const monthSpendTx = spendTransactions.filter(tx => tx.month === monthView);

  // Per-category budget and spend for selected month
  const monthCategoryStats = allCategories.map(cat => {
    const allocated = monthBudgetTx.filter(tx => tx.category === cat).reduce((sum, tx) => sum + tx.amount, 0);
    const spent = monthSpendTx.filter(tx => tx.category === cat).reduce((sum, tx) => sum + tx.amount, 0);
    const available = allocated - spent;
    return { cat, allocated, spent, available };
  });

  // Add a ref to track if the comment is user-edited
  const [isCommentUserEdited, setIsCommentUserEdited] = useState(false);

  // Helper to get total for categories whose tag is not 'NoTag'
  function getNonNoTagTotal(amounts: Record<string, number>) {
    const noTag = budgetTags.find(t => t.name === 'NoTag');
    const noTagId = noTag?.id;
    return budgetCategories.reduce((sum, cat) => {
      if (cat.parent_id !== noTagId) {
        return sum + (amounts[cat.name] || 0);
      }
      return sum;
    }, 0);
  }

  // Update prefill logic for budgetAmounts and comment
  useEffect(() => {
    if (showAddBudget) {
      // Check if there are any budget transactions for the selected month
      const hasRecords = budgetTransactions.some(tx => tx.month === budgetMonth);
      if (!hasRecords) {
        const newAmounts = Object.fromEntries(budgetCategories.map(cat => [cat.name, cat.defaultValue || 0]));
        setBudgetAmounts(newAmounts);
        const total = getNonNoTagTotal(newAmounts);
        setBudgetComment(`Total: ${total}`);
        setIsCommentUserEdited(false);
      } else {
        setBudgetAmounts(Object.fromEntries(budgetCategories.map(cat => [cat.name, 0])));
        setBudgetComment('');
        setIsCommentUserEdited(false);
      }
    }
  }, [showAddBudget, budgetMonth, budgetCategories, budgetTransactions]);

  // When budgetAmounts change, update comment if not user-edited
  useEffect(() => {
    if (showAddBudget && !isCommentUserEdited) {
      const total = getNonNoTagTotal(budgetAmounts);
      setBudgetComment(`Total: ${total}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetAmounts, showAddBudget]);

  const handleEditBudgetTag = (id: string, name: string) => {
    setEditingTag(id);
    setEditTagValue(name);
  };

  const [tagOrder, setTagOrder] = useState<string[]>([]);
  useEffect(() => {
    setTagOrder(budgetTags.map(tag => tag.id));
  }, [budgetTags]);
  const handleTagDragEnd = async (e: any) => {
    const { active, over } = e;
    const noTag = budgetTags.find(t => t.name === 'NoTag');
    if (!active.id || !over?.id || !noTag) return;
    if (active.id === noTag.id || over.id === noTag.id) return; // Prevent moving NoTag
    const oldIndex = tagOrder.indexOf(active.id);
    const newIndex = tagOrder.indexOf(over.id);
    const newOrder = arrayMove(tagOrder, oldIndex, newIndex);
    setTagOrder(newOrder);
    // Persist new order to Supabase
    await Promise.all(newOrder.map((id, idx) =>
      supabase.from('categoriesbudget').update({ order: idx }).eq('id', id)
    ));
    await fetchAllData();
  };

  useEffect(() => {
    const noTag = budgetTags.find(t => t.name === 'NoTag');
    if (noTag) setNewBudgetCategoryTag(noTag.id);
  }, [budgetTags]);

  const handleCategoryDragEnd = async (e: any, tagId: string | null) => {
    const { active, over } = e;
    if (!active.id || !over?.id || active.id === over.id) return;
    // Get categories for this tag, in current order
    const cats = budgetCategories.filter(cat => cat.parent_id === tagId);
    const oldIndex = cats.findIndex(cat => cat.id === active.id);
    const newIndex = cats.findIndex(cat => cat.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(cats, oldIndex, newIndex);
    // Update category_order in Supabase
    await Promise.all(newOrder.map((cat, idx) =>
      supabase.from('categoriesbudget').update({ order: idx }).eq('id', cat.id)
    ));
    await fetchAllData();
  };

  // State for filters
  const [listTabFilters, setListTabFilters] = useState({
    search: '',
    categories: [] as string[],
    startDate: '',
    endDate: '',
  });
  const [monthTabFilters, setMonthTabFilters] = useState({ category: '', comment: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Filter transactions based on listFilters
  const filteredBudgetTransactions = budgetTransactions.filter(tx => {
    const matchesSearch = listTabFilters.search ? tx.comment?.toLowerCase().includes(listTabFilters.search.toLowerCase()) : true;
    const matchesCategory = listTabFilters.categories.length > 0 ? listTabFilters.categories.includes(tx.category) : true;
    const matchesStartDate = listTabFilters.startDate ? tx.date >= listTabFilters.startDate : true;
    const matchesEndDate = listTabFilters.endDate ? tx.date <= listTabFilters.endDate : true;
    return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
  });

  const filteredSpendTransactions = spendTransactions.filter(tx => {
    const matchesSearch = listTabFilters.search ? tx.comment?.toLowerCase().includes(listTabFilters.search.toLowerCase()) : true;
    const matchesCategory = listTabFilters.categories.length > 0 ? listTabFilters.categories.includes(tx.category) : true;
    const matchesStartDate = listTabFilters.startDate ? tx.date >= listTabFilters.startDate : true;
    const matchesEndDate = listTabFilters.endDate ? tx.date <= listTabFilters.endDate : true;
    return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
  });

  // Filtered transactions for selected month
  const filteredMonthBudgetTx = monthBudgetTx.filter(tx => {
    const matchesCategory = monthTabFilters.category ? tx.category.toLowerCase().includes(monthTabFilters.category.toLowerCase()) : true;
    const matchesComment = monthTabFilters.comment ? tx.comment.toLowerCase().includes(monthTabFilters.comment.toLowerCase()) : true;
    return matchesCategory && matchesComment;
  });

  const filteredMonthSpendTx = monthSpendTx.filter(tx => {
    const matchesCategory = monthTabFilters.category ? tx.category.toLowerCase().includes(monthTabFilters.category.toLowerCase()) : true;
    const matchesComment = monthTabFilters.comment ? tx.comment.toLowerCase().includes(monthTabFilters.comment.toLowerCase()) : true;
    return matchesCategory && matchesComment;
  });

  // Replace sort state and handleSort logic:
  const [budgetSort, setBudgetSort] = useState<{ field: string; direction: 'asc' | 'desc' | null }>({ field: '', direction: null });
  const [spendSort, setSpendSort] = useState<{ field: string; direction: 'asc' | 'desc' | null }>({ field: '', direction: null });

  function handleSort(field: string, type: 'budget' | 'spend') {
    if (type === 'budget') {
      setBudgetSort(s => {
        if (s.field !== field) return { field, direction: 'asc' };
        if (s.direction === 'asc') return { field, direction: 'desc' };
        if (s.direction === 'desc') return { field: '', direction: null };
        return { field, direction: 'asc' };
      });
    } else {
      setSpendSort(s => {
        if (s.field !== field) return { field, direction: 'asc' };
        if (s.direction === 'asc') return { field, direction: 'desc' };
        if (s.direction === 'desc') return { field: '', direction: null };
        return { field, direction: 'asc' };
      });
    }
  }

  function sortTransactions(transactions: any[], sort: { field: string; direction: 'asc' | 'desc' | null }) {
    if (!sort.field || !sort.direction) return transactions;
    return [...transactions].sort((a, b) => {
      if (a[sort.field] < b[sort.field]) return sort.direction === 'asc' ? -1 : 1;
      if (a[sort.field] > b[sort.field]) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  const sortedBudgetTransactions = sortTransactions(filteredBudgetTransactions, budgetSort);
  const sortedSpendTransactions = sortTransactions(filteredSpendTransactions, spendSort);

  // For tag score cards, use budgetTags sorted by 'order':
  const sortedTags = [...budgetTags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // For category score cards, group by tag order, and within each tag, sort categories by 'order':
  const orderedCategories = sortedTags.flatMap(tag =>
    budgetCategories.filter(cat => cat.parent_id === tag.id).sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0))
  );

  // Placeholder for handleEditTransaction and handleDeleteTransaction
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<BudgetTransaction | SpendTransaction | null>(null);
  const [editTxFields, setEditTxFields] = useState<any>({});

  const handleEditTransaction = (tx: BudgetTransaction | SpendTransaction) => {
    setEditTx(tx);
    setEditTxFields({
      date: tx.date,
      month: tx.month,
      category: tx.category,
      amount: tx.amount,
      comment: tx.comment,
      type: (tx as any).type || 'budget',
    });
    setEditDialogOpen(true);
  };

  const handleEditTxField = (field: string, value: any) => {
    setEditTxFields((f: any) => ({ ...f, [field]: value }));
  };

  const handleSaveEditTx = async () => {
    if (!editTx) return;
    const catObj = budgetCategories.find(c => c.name === editTxFields.category);
    const updateObj: any = {
      date: editTxFields.date,
      month: editTxFields.month,
      category: editTxFields.category,
      amount: parseFloat(editTxFields.amount),
      comment: editTxFields.comment,
      type: editTxFields.type,
    };
    if (catObj) updateObj.category_id = catObj.id;
    const { error } = await supabase.from('transactionsbudget').update(updateObj).eq('id', editTx.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update transaction: ' + error.message, variant: 'destructive' });
      return;
    }
    await fetchAllData();
    setEditDialogOpen(false);
    setEditTx(null);
    toast({ title: 'Transaction Updated', description: 'Successfully updated transaction.' });
  };

  const handleDeleteTransaction = async (tx: BudgetTransaction | SpendTransaction) => {
    if (!window.confirm(`Are you sure you want to delete the transaction '${tx.comment}'? This cannot be undone.`)) return;
    const { error } = await supabase.from('transactionsbudget').delete().eq('id', tx.id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete transaction: ' + error.message,
        variant: 'destructive',
      });
      return;
    }
    await fetchAllData();
    toast({
      title: 'Transaction Deleted',
      description: 'Successfully deleted transaction.',
    });
  };

  // Helper to display month as 'MMMM yyyy' (e.g., 'July 2025')
  function displayMonth(monthStr: string) {
    if (!monthStr) return '';
    try {
      // Parse 'yyyy-MM' to Date
      const date = parse(monthStr, 'yyyy-MM', new Date());
      return format(date, 'MMMM yyyy');
    } catch {
      return monthStr;
    }
  }

  // Handler to export Month View as PDF
  async function handleExportMonthPDF() {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const month = displayMonth(monthView);
    const reportDate = format(new Date(), 'MMMM dd, yyyy, HH:mm:ss');

    // Add title and report date
    pdf.setFontSize(18);
    pdf.text(`Budget Report: ${month}`, 40, 40);
    pdf.setFontSize(12);
    pdf.text(`Report generated: ${reportDate}`, 40, 60);

    // Capture score cards
    const scoreCardsElem = document.getElementById('month-score-cards');
    if (scoreCardsElem) {
      const canvas = await html2canvas(scoreCardsElem, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 40, 80, 520, 120);
    }

    // Capture activities
    const activitiesElem = document.getElementById('month-activities');
    let y = 220;
    if (activitiesElem) {
      const canvas = await html2canvas(activitiesElem, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 40, y, 520, 180);
    }

    pdf.save(`Budget_Report_${month}.pdf`);
  }

  const handleExportCSV = () => {
    if (sortedBudgetTransactions.length === 0 && sortedSpendTransactions.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no transactions to export with the current filters.',
        variant: 'destructive',
      });
      return;
    }

    const reportDate = format(new Date(), 'MMMM dd, yyyy, HH:mm:ss');
    const csvRows = [`Report Generated: ${reportDate}`, ''];
    const headers = ['Date', 'Month', 'Category', 'Amount', 'Comment'];

    // Budget Transactions
    if (sortedBudgetTransactions.length > 0) {
      csvRows.push('Budget Transactions');
      csvRows.push(headers.join(','));
      sortedBudgetTransactions.forEach(tx => {
        const comment = `"${(tx.comment || '').replace(/"/g, '""')}"`;
        const row = [
          tx.date,
          displayMonth(tx.month),
          tx.category,
          tx.amount.toFixed(2),
          comment,
        ];
        csvRows.push(row.join(','));
      });
    }

    // Separator
    if (sortedBudgetTransactions.length > 0 && sortedSpendTransactions.length > 0) {
      csvRows.push(''); // Add a blank line for spacing
    }

    // Spend Transactions
    if (sortedSpendTransactions.length > 0) {
      csvRows.push('Spend Transactions');
      csvRows.push(headers.join(','));
      sortedSpendTransactions.forEach(tx => {
        const comment = `"${(tx.comment || '').replace(/"/g, '""')}"`;
        const row = [
          tx.date,
          displayMonth(tx.month),
          tx.category,
          tx.amount.toFixed(2),
          comment,
        ];
        csvRows.push(row.join(','));
      });
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'budget_transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                <span className="sm:hidden">Budget</span>
                <span className="hidden sm:inline">Budget tracker</span>
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={() => setShowAddBudget(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2"
                size="sm"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Budget</span>
              </Button>
              <Button
                onClick={() => setShowSpendBudget(true)}
                className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2"
                size="sm"
              >
                <TrendingDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Spend</span>
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                size="sm"
              >
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-2 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                size="sm"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mt-6">
        {/* All main content including Tabs goes here */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6 bg-gray-100 rounded-xl flex gap-1 pl-4 py-2 justify-start" onDragEnd={handleTagDragEnd}>
            <TabsTrigger value="dashboard" className="font-semibold text-gray-700 rounded-lg px-4 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <BarChart3 className="inline-block mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="monthview" className="font-semibold text-gray-700 rounded-lg px-4 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <Wallet className="inline-block mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Month View</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="font-semibold text-gray-700 rounded-lg px-4 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <Tag className="inline-block mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Category Management</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="font-semibold text-gray-700 rounded-lg px-4 py-2 transition-colors focus:outline-none data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-black data-[state=active]:font-bold hover:bg-white/70">
              <ListIcon className="inline-block mr-2 h-5 w-5" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <div className="relative">
              {/* Group wise Balance */}
              <div className="mb-4 text-lg font-semibold text-gray-700">Group wise Balance</div>
              {/* Tag Score Cards */}
              {sortedTags.length > 0 && (
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
                  {sortedTags.map(tag => {
                    let color = 'text-blue-700 bg-gradient-to-br from-blue-100 to-blue-50';
                    let icon;
                    if (tag.name === 'NoTag') {
                      color = 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-yellow-50';
                      icon = <Wallet className="h-7 w-7 text-yellow-500" />;
                    } else {
                      color = 'text-blue-700 bg-gradient-to-br from-blue-100 to-blue-50';
                      icon = <Banknote className="h-7 w-7 text-blue-500" />;
                    }
                    return (
                      <Card
                        key={tag.id}
                        className={`flex flex-col justify-between p-2 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.03] hover:shadow-2xl active:scale-95 ${color}`}
                        style={{ minHeight: 130 }}
                      >
                        <div className="flex flex-row items-center justify-between">
                          <div>
                            <div className="text-base font-semibold sm:text-lg tracking-tight mb-1 animate-fade-in-slow">{tag.name}</div>
                            <div className="text-xs text-gray-700">Total Budget</div>
                            <div className="text-lg font-bold animate-fade-in-slow">{tagTotals.find(t => t.tag.id === tag.id)?.totalBudget.toFixed(2) || '0.00'}</div>
                          </div>
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-inner animate-fade-in-slow">
                            {icon}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs text-gray-700">Available Balance</div>
                          <div className="text-xl font-bold animate-fade-in-slow">{tagTotals.find(t => t.tag.id === tag.id)?.available.toFixed(2) || '0.00'}</div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              <div className="my-6 text-lg font-semibold text-gray-700">Category wise Balance</div>
              {/* Category Score Cards */}
              {orderedCategories.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 animate-fade-in">
                  {orderedCategories.map(cat => {
                    const balance = availableBalances[cat.name] ?? 0;
                    const totalBudget = totalBudgetPerCategory[cat.name] ?? 0;
                    let color = 'text-emerald-700 bg-gradient-to-br from-emerald-100 to-emerald-50';
                    let icon;
                    const tag = budgetTags.find(t => t.id === cat.parent_id);
                    if (tag?.name === 'NoTag') {
                      color = 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-yellow-50';
                      icon = <Wallet className="h-7 w-7 text-yellow-500" />;
                    } else {
                      color = 'text-emerald-700 bg-gradient-to-br from-emerald-100 to-emerald-50';
                      icon = <PiggyBank className="h-7 w-7 text-emerald-500" />;
                    }
                    if (balance < 0) {
                      color = 'text-red-700 bg-gradient-to-br from-red-100 to-red-50';
                    }
                    return (
                      <Card
                        key={cat.id}
                        className={`flex flex-col justify-between p-2 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.03] hover:shadow-2xl active:scale-95 ${color}`}
                        style={{ minHeight: 90 }}
                      >
                        <div className="flex flex-row items-center justify-between">
                          <div>
                            <div className="text-base font-semibold sm:text-lg tracking-tight mb-1 animate-fade-in-slow">{cat.name}</div>
                            <div className="text-xs text-gray-700">Total Budget</div>
                            <div className="text-lg font-bold animate-fade-in-slow">{totalBudget.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-inner animate-fade-in-slow">
                            {icon}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs text-gray-700">Available Balance</div>
                          <div className="text-xl font-bold animate-fade-in-slow">{balance.toFixed(2)}</div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              {isMobile && (
                <div className="fixed bottom-6 right-6 z-50">
                  {showFabMenu && (
                    <div className="absolute bottom-16 right-0 space-y-3 mb-2 bg-white rounded-lg shadow-lg p-2">
                      <Button
                        onClick={() => { setShowAddBudget(true); setShowFabMenu(false); }}
                        className="w-full flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                      >
                        <Plus className="h-5 w-5" /> Add Budget
                      </Button>
                      <Button
                        onClick={() => { setShowSpendBudget(true); setShowFabMenu(false); }}
                        className="w-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg"
                      >
                        <TrendingDown className="h-5 w-5" /> Spend
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={() => setShowFabMenu(fab => !fab)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full h-14 w-14 p-0 flex items-center justify-center"
                    size="sm"
                    aria-label="Add or Spend"
                  >
                    <Plus className={`h-7 w-7 transition-transform ${showFabMenu ? 'rotate-45' : ''}`} />
                  </Button>
                </div>
              )}
              {/* Pie Chart for Category Balances */}
              {allCategories.length > 0 && (
                <Card className="mb-6 rounded-2xl shadow-lg animate-fade-in-slow bg-gradient-to-br from-white to-blue-50">
                  <CardHeader>
                    <CardTitle>Balance Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={allCategories.map((cat, idx) => ({ name: cat, value: Math.max(availableBalances[cat] ?? 0, 0) }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name }) => name}
                            isAnimationActive={true}
                            animationDuration={800}
                          >
                            {allCategories.map((cat, idx) => (
                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="monthview">
            <div className="w-full h-full p-2 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row gap-2 items-center">
                <label className="text-sm font-medium">Select Month</label>
                <Input
                  type="month"
                  value={monthView}
                  onChange={e => setMonthView(e.target.value)}
                  className="w-full sm:w-48 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                />
                <Button onClick={handleExportMonthPDF} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold" type="button">
                  Export as PDF
                </Button>
              </div>
              {/* Score cards for each category */}
              <div id="month-score-cards" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 animate-fade-in">
                {orderedCategories.map(catObj => {
                  const cat = catObj.name;
                  const tag = budgetTags.find(t => t.id === catObj.parent_id);
                  const stat = monthCategoryStats.find(s => s.cat === cat) || { allocated: 0, spent: 0, available: 0 };
                  const allocated = stat.allocated;
                  const spent = stat.spent;
                  const available = stat.available;
                  let color = 'text-emerald-700 bg-gradient-to-br from-emerald-100 to-emerald-50';
                  if (tag?.name === 'NoTag') color = 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-yellow-50';
                  else if (allocated > 0 && spent > allocated) color = 'text-red-700 bg-gradient-to-br from-red-100 to-red-50';
                  else if (allocated > 0 && spent / allocated > 0.8) color = 'text-yellow-700 bg-gradient-to-br from-yellow-100 to-yellow-50';
                  return (
                    <Card key={cat} className={`flex flex-col justify-between p-2 rounded-2xl shadow-lg transition-all duration-200 ${color}`} style={{ minHeight: 90 }}>
                      <div className="flex flex-row items-center justify-between">
                        <div>
                          <div className="text-base font-semibold sm:text-lg tracking-tight mb-1">{cat}</div>
                          <div className="text-xs text-gray-700">Allocated</div>
                          <div className="text-lg font-bold">{allocated.toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs text-gray-700">Spent</div>
                          <div className="text-lg font-bold">{spent.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${allocated === 0 ? 'bg-gray-300' : spent > allocated ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
                            style={{ width: allocated === 0 ? '0%' : `${Math.min(100, (spent / allocated) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {allocated === 0 ? 'No budget set' : `${Math.round((spent / allocated) * 100)}% used, Available: ${available.toFixed(2)}`}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {monthCategoryStats.length > 0 && (
                <>
                  <div className="mb-4 text-lg font-semibold text-gray-700">Recent Spend Activities</div>
                  <div id="month-activities" className="flex flex-row flex-wrap gap-3 mb-8 justify-start">
                    {filteredMonthSpendTx.length === 0 ? (
                      <div className="text-gray-400 text-center py-4">No spend activities for this month.</div>
                    ) : (
                      filteredMonthSpendTx.map(tx => (
                        <div key={tx.id} className="flex flex-col justify-between items-center w-36 h-36 bg-white border border-gray-200 rounded-xl shadow text-center p-2 overflow-hidden">
                          <div>
                            <div className="font-bold text-base text-gray-900 mb-0.5 truncate">{tx.category}</div>
                            <div className="text-xs text-gray-500 mb-1">{tx.date}</div>
                          </div>
                          <div className="text-red-600 font-bold text-lg mb-1">₹{tx.amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-700 flex-1 w-full overflow-hidden break-words" style={{maxHeight: '2.5em'}}>{tx.comment}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="categories">
            {/* Tag Management UI */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Manage Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col sm:flex-row gap-2 sm:gap-2 mb-4" onSubmit={e => { e.preventDefault(); handleAddBudgetTag(); }}>
                  <Input
                    placeholder="Add new tag..."
                    value={newBudgetTag}
                    onChange={e => setNewBudgetTag(e.target.value)}
                    className="min-w-0 flex-grow border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full sm:w-auto text-base"
                  />
                  <Button type="submit" className="w-full sm:w-auto">Add</Button>
                </form>
                <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTagDragEnd}>
                    <SortableContext items={tagOrder} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                        {tagOrder.map(tagId => {
                          const tag = budgetTags.find(t => t.id === tagId);
                          if (!tag) return null;
                          const isNoTag = tag.name === 'NoTag';
                          return (
                            <DraggableItem
                              key={tag.id}
                              id={tag.id}
                              label={editingTag === tag.id ? (
                                <>
                                  <Input
                                    value={editTagValue}
                                    onChange={e => setEditTagValue(e.target.value)}
                                    className="w-24 h-8 text-sm border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                                    onKeyDown={e => e.key === 'Enter' && handleSaveEditTag()}
                                  />
                                  <Button size="sm" onClick={handleSaveEditTag}>Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}>Cancel</Button>
                                </>
                              ) : (
                                <span className="text-sm font-medium">{tag.name}</span>
                              )}
                            >
                              {editingTag === tag.id ? (
                                <>
                                  <Button size="sm" onClick={handleSaveEditTag} className="ml-1 flex items-center w-full sm:w-auto">
                                    <Trophy className="h-4 w-4 mr-1 text-emerald-500" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)} className="ml-1 flex items-center w-full sm:w-auto">
                                    <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingTag(tag.id); setEditTagValue(tag.name); }} className="text-blue-500 hover:text-blue-700 flex items-center"><SquarePen className="h-3 w-3" /></button>
                                  <button onClick={() => handleRemoveBudgetTag(tag.id)} className="text-red-500 hover:text-red-700 flex items-center"><Trash className="h-3 w-3" /></button>
                                </>
                              )}
                            </DraggableItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </CardContent>
            </Card>
            {/* Add Category Form (with tag selector) - mobile friendly */}
            <form className="flex flex-col sm:flex-row gap-2 sm:gap-2 mb-6" onSubmit={e => { e.preventDefault(); handleAddBudgetCategory(); }}>
              <Input
                placeholder="Add new budget category..."
                value={newBudgetCategory}
                onChange={e => setNewBudgetCategory(e.target.value)}
                className="min-w-0 flex-grow border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full sm:w-auto text-base"
              />
              <Select value={newBudgetCategoryTag} onValueChange={setNewBudgetCategoryTag}>
                <SelectTrigger className="border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full sm:w-auto">
                  <SelectValue placeholder="Select tag" />
                </SelectTrigger>
                <SelectContent>
                  {budgetTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Default Value"
                value={newBudgetCategoryDefault}
                onChange={e => setNewBudgetCategoryDefault(e.target.value)}
                className="w-full sm:w-24 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
              />
              <Button type="submit" className="w-full sm:w-auto">Add</Button>
            </form>
            {/* Category Management UI, grouped by tag - mobile friendly */}
            {budgetTags.map(tag => (
              <Card key={tag.id} className="mb-6">
                <CardHeader>
                  <CardTitle>{tag.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleCategoryDragEnd(e, tag.id)}>
                    <SortableContext items={budgetCategories.filter(cat => cat.parent_id === tag.id).map(cat => cat.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                        {budgetCategories.filter(cat => cat.parent_id === tag.id).map(cat => (
                          <DraggableItem
                            key={cat.id}
                            id={cat.id}
                            label={editingCategory === cat.id ? (
                              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                                <Input
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="min-w-0 flex-grow h-8 text-sm border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition flex items-center w-full sm:w-auto text-base"
                                  onKeyDown={e => e.key === 'Enter' && handleSaveEditCategory()}
                                  style={{ margin: 0 }}
                                />
                                <Select value={editingCategoryTag} onValueChange={setEditingCategoryTag}>
                                  <SelectTrigger className="border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full sm:w-auto">
                                    <SelectValue placeholder="Select tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {budgetTags.map(tag => (
                                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Default Value"
                                  value={editingCategoryDefault}
                                  onChange={e => setEditingCategoryDefault(e.target.value)}
                                  className="w-full sm:w-24 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                                />
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center min-w-0">
                                <span className="min-w-0 flex-grow h-8 text-sm flex items-center truncate">{cat.name}</span>
                                <span className="text-xs text-gray-500 bg-gray-200 rounded px-2 py-0.5 ml-2">{budgetTags.find(t => t.id === cat.parent_id)?.name || 'No Tag'}</span>
                              </div>
                            )}
                          >
                            {editingCategory === cat.id ? (
                              <>
                                <Button size="sm" onClick={handleSaveEditCategory} className="ml-1 flex items-center w-full sm:w-auto">
                                  <Trophy className="h-4 w-4 mr-1 text-emerald-500" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)} className="ml-1 flex items-center w-full sm:w-auto">
                                  <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" /> Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingCategory(cat.id); setEditValue(cat.name); setEditingCategoryTag(cat.parent_id || ''); setEditingCategoryDefault(cat.defaultValue?.toString() || ''); }} className="text-blue-500 hover:text-blue-700 flex items-center"><SquarePen className="h-3 w-3" /></button>
                                <button onClick={() => handleRemoveBudgetCategory(cat.id)} className="text-red-500 hover:text-red-700 flex items-center"><Trash className="h-3 w-3" /></button>
                              </>
                            )}
                          </DraggableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            ))}
            {/* No Tag group */}
            {budgetCategories.some(cat => !cat.parent_id) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>No Tag</CardTitle>
                </CardHeader>
                <CardContent>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleCategoryDragEnd(e, null)}>
                    <SortableContext items={budgetCategories.filter(cat => !cat.parent_id).map(cat => cat.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                        {budgetCategories.filter(cat => !cat.parent_id).map(cat => (
                          <DraggableItem
                            key={cat.id}
                            id={cat.id}
                            label={editingCategory === cat.id ? (
                              <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
                                <Input
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="min-w-0 flex-grow h-8 text-sm border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition flex items-center w-full sm:w-auto text-base"
                                  onKeyDown={e => e.key === 'Enter' && handleSaveEditCategory()}
                                  style={{ margin: 0 }}
                                />
                                <Select value={editingCategoryTag} onValueChange={setEditingCategoryTag}>
                                  <SelectTrigger className="border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full sm:w-auto">
                                    <SelectValue placeholder="Select tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {budgetTags.map(tag => (
                                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Default Value"
                                  value={editingCategoryDefault}
                                  onChange={e => setEditingCategoryDefault(e.target.value)}
                                  className="w-full sm:w-24 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                                />
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center min-w-0">
                                <span className="min-w-0 flex-grow h-8 text-sm flex items-center truncate">{cat.name}</span>
                                <span className="text-xs text-gray-500 bg-gray-200 rounded px-2 py-0.5 ml-2">{budgetTags.find(t => t.id === cat.parent_id)?.name || 'No Tag'}</span>
                              </div>
                            )}
                          >
                            {editingCategory === cat.id ? (
                              <>
                                <Button size="sm" onClick={handleSaveEditCategory} className="ml-1 flex items-center w-full sm:w-auto">
                                  <Trophy className="h-4 w-4 mr-1 text-emerald-500" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)} className="ml-1 flex items-center w-full sm:w-auto">
                                  <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" /> Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingCategory(cat.id); setEditValue(cat.name); setEditingCategoryTag(cat.parent_id || ''); setEditingCategoryDefault(cat.defaultValue?.toString() || ''); }} className="text-blue-500 hover:text-blue-700 flex items-center"><SquarePen className="h-3 w-3" /></button>
                                <button onClick={() => handleRemoveBudgetCategory(cat.id)} className="text-red-500 hover:text-red-700 flex items-center"><Trash className="h-3 w-3" /></button>
                              </>
                            )}
                          </DraggableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="overview">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ListIcon className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">All Transactions</h2>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg border bg-blue-600 hover:bg-blue-700 text-white text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full sm:w-auto"
                    >
                      Export as CSV
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowFilters(v => !v)}
                      className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg border bg-white text-black text-base font-medium shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full sm:w-auto"
                    >
                      <FilterIcon className="h-5 w-5 sm:h-5 sm:w-5 text-black" />
                      Filters
                      {showFilters ? <ChevronUp className="h-5 w-5 text-black" /> : <ChevronDown className="h-5 w-5 text-black" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto rounded-lg shadow-sm mb-4">
                  <table className="min-w-[600px] w-full text-left rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white text-xs sm:text-sm">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="py-2 px-2 min-w-[90px] font-semibold text-gray-700">Date</th>
                        <th className="py-2 px-2 min-w-[110px] font-semibold text-gray-700">Month</th>
                        <th className="py-2 px-2 min-w-[120px] font-semibold text-gray-700">Category</th>
                        <th className="py-2 px-2 min-w-[90px] font-semibold text-gray-700">Amount</th>
                        <th className="py-2 px-2 min-w-[120px] font-semibold text-gray-700">Comment</th>
                        <th className="py-2 px-2 min-w-[80px] font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBudgetTransactions.length === 0 && sortedSpendTransactions.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-6 text-gray-400">No transactions yet.</td></tr>
                      ) : (
                        <>
                          {sortedBudgetTransactions.map((tx, idx) => (
                            <tr key={tx.id || idx} className="even:bg-gray-50 hover:bg-blue-50 transition-colors border-b last:border-b-0">
                              <td className="py-1.5 px-2 whitespace-nowrap">{tx.date || ''}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{displayMonth(tx.month || '')}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{tx.category || ''}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap text-emerald-600">{typeof tx.amount === 'number' ? tx.amount.toFixed(2) : ''}</td>
                              <td className="py-1.5 px-2 whitespace-pre-line break-words max-w-[120px]">{tx.comment || ''}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => handleEditTransaction(tx)} className="text-blue-500 hover:text-blue-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    <SquarePen className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => handleDeleteTransaction(tx)} className="text-red-500 hover:text-red-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400">
                                    <Trash className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {sortedSpendTransactions.map((tx, idx) => (
                            <tr key={tx.id || idx} className="even:bg-gray-50 hover:bg-blue-50 transition-colors border-b last:border-b-0">
                              <td className="py-1.5 px-2 whitespace-nowrap">{tx.date || ''}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{displayMonth(tx.month || '')}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{tx.category || ''}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap text-red-600">{typeof tx.amount === 'number' ? tx.amount.toFixed(2) : ''}</td>
                              <td className="py-1.5 px-2 whitespace-pre-line break-words max-w-[120px]">{tx.comment || ''}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => handleEditTransaction(tx)} className="text-blue-500 hover:text-blue-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    <SquarePen className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => handleDeleteTransaction(tx)} className="text-red-500 hover:text-red-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400">
                                    <Trash className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      {/* Add Budget Dialog */}
      <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
        <DialogContent className="rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-md md:max-w-xl p-0 overflow-hidden animate-dialog-in bg-white/95 border-0 shadow-none m-2 sm:m-0">
          <Card className="bg-transparent border-0 shadow-none p-0">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl">Add Budget</DialogTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 animate-fade-in max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleAddBudget} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input type="date" value={budgetDate} onChange={e => setBudgetDate(e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base py-2" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <Input type="month" value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {budgetCategories.map(cat => (
                    <div key={cat.id} className="flex flex-col gap-1">
                      <label className="flex items-center gap-1 font-semibold text-base mb-1">
                        <span className="text-xl">₹</span>
                        {cat.name} <span className="font-normal text-gray-500">(₹)</span>
                      </label>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" value={budgetAmounts[cat.name] || ''} onChange={e => setBudgetAmounts(a => ({ ...a, [cat.name]: parseFloat(e.target.value) }))} className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Comment</label>
                  <Textarea value={budgetComment} onChange={e => { setBudgetComment(e.target.value); setIsCommentUserEdited(true); }} className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base min-h-[48px]" />
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-4">
                  <Button type="submit" className="w-full sm:w-auto text-base py-2">Save</Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto text-base py-2" onClick={() => setShowAddBudget(false)}>Cancel</Button>
                </DialogFooter>
              </form>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      {/* Spend Dialog */}
      <Dialog open={showSpendBudget} onOpenChange={setShowSpendBudget}>
        <DialogContent className="rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-md md:max-w-xl p-0 overflow-hidden animate-dialog-in bg-white/95 border-0 shadow-none m-2 sm:m-0">
          <Card className="bg-transparent border-0 shadow-none p-0">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl">Spend</DialogTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 animate-fade-in max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSpendBudget} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input type="date" value={spendDate} onChange={e => setSpendDate(e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base py-2" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <Input type="month" value={spendMonth} onChange={e => setSpendMonth(e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select value={spendCategory} onValueChange={setSpendCategory}>
                    <SelectTrigger className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="flex items-center gap-1 font-semibold text-base mb-1">
                    <span className="text-xl">₹</span>
                    Amount <span className="font-normal text-gray-500">(₹)</span>
                  </label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Comment</label>
                  <Textarea value={spendComment} onChange={e => setSpendComment(e.target.value)} className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base min-h-[48px]" />
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-4">
                  <Button type="submit" className="w-full sm:w-auto text-base py-2">Save</Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto text-base py-2" onClick={() => setShowSpendBudget(false)}>Cancel</Button>
                </DialogFooter>
              </form>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden animate-dialog-in">
          <Card className="bg-white/95 border-0 shadow-none p-0">
            <CardHeader className="p-6 pb-2">
              <DialogTitle className="text-xl">Edit Transaction</DialogTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 animate-fade-in">
              <form onSubmit={e => { e.preventDefault(); handleSaveEditTx(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input type="date" value={editTxFields.date || ''} onChange={e => handleEditTxField('date', e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <Input type="month" value={editTxFields.month || ''} onChange={e => handleEditTxField('month', e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select
                    value={editTxFields.category || ''}
                    onValueChange={val => handleEditTxField('category', val)}
                  >
                    <SelectTrigger className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <Input type="number" step="0.01" min="0" value={editTxFields.amount || ''} onChange={e => handleEditTxField('amount', e.target.value)} required className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Comment</label>
                  <Textarea value={editTxFields.comment || ''} onChange={e => handleEditTxField('comment', e.target.value)} className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base" />
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-4">
                  <Button type="submit" className="w-full sm:w-auto">Save</Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                </DialogFooter>
              </form>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage; 