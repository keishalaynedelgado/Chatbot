import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantService } from '../services/tenantService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const tenantSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  companyName: z.string().min(3, 'Company name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscriptionPlan: z.enum(['basic', 'premium', 'enterprise']).default('basic')
})

const TenantManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getAll()
  })

  const createMutation = useMutation({
    mutationFn: tenantService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants'])
      setIsDialogOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tenantService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants'])
      setIsDialogOpen(false)
      setEditingTenant(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: tenantService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants'])
    }
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(tenantSchema)
  })

  const onSubmit = (formData) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
    reset()
  }

  const handleEdit = (tenant) => {
    setEditingTenant(tenant)
    reset(tenant)
    setIsDialogOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      deleteMutation.mutate(id)
    }
  }

  const tenants = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-gray-500 mt-1">Manage all tenants in the system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTenant(null); reset() }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register('companyName')} />
                {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                <select 
                  id="subscriptionPlan" 
                  {...register('subscriptionPlan')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <Button type="submit" className="w-full">
                {editingTenant ? 'Update' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading tenants...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.companyName}</TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isActive ? 'default' : 'destructive'}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(tenant)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(tenant.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No tenants found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TenantManagement