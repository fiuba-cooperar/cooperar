import { Navigate, type RouteObject } from 'react-router';
import { Role } from '@/api/generated/model';
import { AccountHomePage } from '@/features/account/AccountHomePage';
import { AccountLayout } from '@/features/account/AccountLayout';
import {
  ACCOUNT_HOME_PATH,
  ACCOUNT_REGISTRATION_REQUEST_PATH,
  ACCOUNT_NOTIFICATIONS_PATH,
  ACCOUNT_REGISTRATION_REQUESTS_PATH,
  NEW_REGISTRATION_REQUEST_PATH,
} from '@/features/account/accountSections';
import { CorrectRegistrationPage } from '@/features/account/CorrectRegistrationPage';
import { NewRegistrationRequestPage } from '@/features/account/NewRegistrationRequestPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { RegistrationRequestsPage } from '@/features/account/RegistrationRequestsPage';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { AdminLayout } from '@/features/admin/AdminLayout';
import {
  ADMIN_HOME_PATH,
  ADMIN_ORGANIZATIONS_PATH,
  ADMIN_PRODUCT_CATEGORIES_PATH,
  ADMIN_REGISTRATIONS_PATH,
  ADMIN_USERS_PATH,
} from '@/features/admin/adminSections';
import { OrganizationsPage } from '@/features/admin/OrganizationsPage';
import { ProductCategoriesPage } from '@/features/admin/ProductCategoriesPage';
import { RegistrationsPage } from '@/features/admin/RegistrationsPage';
import { UserDetailPage } from '@/features/admin/UserDetailPage';
import { UsersPage } from '@/features/admin/UsersPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { FORGOT_PASSWORD_PATH, RESET_PASSWORD_PATH } from '@/features/auth/passwordResetPaths';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { VERIFY_EMAIL_PATH, VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { CooperativeHomePage } from '@/features/cooperative/CooperativeHomePage';
import { CooperativeLayout } from '@/features/cooperative/CooperativeLayout';
import { COOPERATIVE_PATH, COOPERATIVE_SECTIONS } from '@/features/cooperative/cooperativeSections';
import { CooperativeEntry } from '@/features/cooperative/CooperativeEntry';
import { InquiriesPage } from '@/features/cooperative/InquiriesPage';
import { InquiryDetailPage } from '@/features/cooperative/InquiryDetailPage';
import { ProductFormPage } from '@/features/cooperative/ProductFormPage';
import { ProductsPage } from '@/features/cooperative/ProductsPage';
import { ProfilePage } from '@/features/cooperative/ProfilePage';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { ComingSoonPage } from '@/features/home/ComingSoonPage';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { ProductDetailPage } from '@/features/catalog/ProductDetailPage';
import { CATALOG_PATH } from '@/features/catalog/productSearch';
import { HomePage } from '@/features/home/HomePage';
import { OrganizationProfilePage } from '@/features/organizations/OrganizationProfilePage';
import { OrganizationSearchPage } from '@/features/organizations/OrganizationSearchPage';
import { ORGANIZATIONS_PATH } from '@/features/organizations/organizationSearch';
import { AppLayout } from '@/components/layout/AppLayout';
import { PUBLIC_SECTIONS, REGISTER_PATH } from '@/components/layout/publicSections';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: REGISTER_PATH, element: <RegisterPage /> },
      { path: VERIFY_EMAIL_PATH, element: <VerifyEmailPage /> },
      { path: FORGOT_PASSWORD_PATH, element: <ForgotPasswordPage /> },
      { path: RESET_PASSWORD_PATH, element: <ResetPasswordPage /> },
      { path: ORGANIZATIONS_PATH, element: <OrganizationSearchPage /> },
      { path: CATALOG_PATH, element: <CatalogPage /> },
      { path: `${CATALOG_PATH}/:id`, element: <ProductDetailPage /> },
      // The map used to be its own section; it is now a view of the directory.
      { path: 'map', element: <Navigate to={`${ORGANIZATIONS_PATH}?view=map`} replace /> },
      ...PUBLIC_SECTIONS.filter(
        ({ path }) => path !== ORGANIZATIONS_PATH && path !== CATALOG_PATH,
      ).map(({ path, label }) => ({
        path,
        element: <ComingSoonPage title={label} />,
      })),
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: 'organizations/:slug', element: <OrganizationProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // The observatory panel has its own header and side menu instead of the public ones.
    element: <RequireRole role={Role.ADMIN} />,
    children: [
      {
        path: ADMIN_HOME_PATH,
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminHomePage /> },
          { path: ADMIN_REGISTRATIONS_PATH, element: <RegistrationsPage /> },
          { path: ADMIN_ORGANIZATIONS_PATH, element: <OrganizationsPage /> },
          { path: ADMIN_USERS_PATH, element: <UsersPage /> },
          { path: `${ADMIN_USERS_PATH}/:id`, element: <UserDetailPage /> },
          { path: ADMIN_PRODUCT_CATEGORIES_PATH, element: <ProductCategoriesPage /> },
        ],
      },
    ],
  },
  {
    // The cooperative panel has its own header and side menu instead of the public ones.
    element: <RequireRole role={Role.COOPERATIVE} />,
    children: [
      { path: COOPERATIVE_PATH, element: <CooperativeEntry /> },
      {
        // The organization is part of the address, so reloading keeps showing the same one.
        path: `${COOPERATIVE_PATH}/:organizationSlug`,
        element: <CooperativeLayout />,
        children: [
          { index: true, element: <CooperativeHomePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'products/new', element: <ProductFormPage /> },
          { path: 'products/:id', element: <ProductFormPage /> },
          { path: 'inquiries', element: <InquiriesPage /> },
          { path: 'inquiries/:id', element: <InquiryDetailPage /> },
          ...COOPERATIVE_SECTIONS.filter(
            ({ segment }) => !['', 'profile', 'products', 'inquiries'].includes(segment),
          ).map(({ segment, label }) => ({
            path: segment,
            element: <ComingSoonPage title={label} homePath=".." />,
          })),
        ],
      },
    ],
  },
  {
    // The home and the registration requests belong to the signed-in account, not to any of its organizations.
    element: <RequireRole />,
    children: [
      {
        element: <AccountLayout />,
        children: [
          { path: ACCOUNT_HOME_PATH, element: <AccountHomePage /> },
          { path: ACCOUNT_NOTIFICATIONS_PATH, element: <NotificationsPage /> },
          { path: ACCOUNT_REGISTRATION_REQUESTS_PATH, element: <RegistrationRequestsPage /> },
          { path: NEW_REGISTRATION_REQUEST_PATH, element: <NewRegistrationRequestPage /> },
          { path: ACCOUNT_REGISTRATION_REQUEST_PATH, element: <CorrectRegistrationPage /> },
        ],
      },
    ],
  },
];
