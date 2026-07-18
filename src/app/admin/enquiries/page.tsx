import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import AdminNav from '@/components/AdminNav';
import AdminEnquiriesList from '@/components/AdminEnquiriesList';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminEnquiriesPage() {
  // Session check
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  await dbConnect();

  // Query all enquiries
  let enquiries: any[] = [];
  try {
    enquiries = await Enquiry.find({}).sort({ createdAt: -1 }).lean();
  } catch (error) {
    console.error("Failed to query enquiries:", error);
  }

  // Serialize Mongoose docs for client component
  const serializedEnquiries = enquiries.map((enq) => {
    return {
      _id: enq._id.toString(),
      productId: enq.productId || '',
      productTitle: enq.productTitle || '',
      stockNo: enq.stockNo || '',
      name: enq.name,
      email: enq.email,
      phone: enq.phone,
      company: enq.company || '',
      companyAddress: enq.companyAddress || '',
      gstNumber: enq.gstNumber || '',
      panNumber: enq.panNumber || '',
      message: enq.message,
      status: enq.status,
      customerId: enq.customerId ? enq.customerId.toString() : '',
      createdAt: enq.createdAt.toISOString(),
    };
  });

  return (
    <div style={{ paddingBottom: '80px' }}>
      <AdminNav />

      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Client enquiries</h1>
          <p style={{ fontSize: 14 }}>{serializedEnquiries.length} enquir{serializedEnquiries.length === 1 ? 'y' : 'ies'} received — filter, review and update status.</p>
        </div>

        <AdminEnquiriesList initialEnquiries={serializedEnquiries} />
      </div>
    </div>
  );
}
