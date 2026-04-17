'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';

import { SignInForm } from './sign-in-form';

export function SignModal({
  callbackUrl = '/',
  title,
  description,
}: {
  callbackUrl?: string;
  title?: string;
  description?: string;
}) {
  const t = useTranslations('common.sign');
  const { isShowSignModal, setIsShowSignModal } = useAppContext();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const modalTitle = title || t('sign_in_title');
  const modalDescription = description || t('sign_in_description');

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={setIsShowSignModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>
          <SignInForm callbackUrl={callbackUrl} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowSignModal} onOpenChange={setIsShowSignModal}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{modalTitle}</DrawerTitle>
          <DrawerDescription>{modalDescription}</DrawerDescription>
        </DrawerHeader>
        <SignInForm callbackUrl={callbackUrl} className="mt-8 px-4" />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t('cancel_title')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
